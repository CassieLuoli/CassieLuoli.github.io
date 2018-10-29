# React Native 之 拆包

需要解决的基本点：

- 减小插件包

  如果将React Native的SDK打到APK里面，会让apk引起以M为单位的体积增长，这对动态加载应用来说是个很大的负担。

- 在多个插件之间共享通用组件

  React Native打包出的JS 包里面，内置了大概270个公共的module，一个最简单的Hello World的React Native的JS包约530K，而其中520K都是这些公共组件，这意味着我们在动态加载这些插件包的时候，很大程度上都是在重新加载这些公共的部分。

- 按需加载

  作为一个插件化的框架，我们希望对不同的插件可以按需进行加载，分别做版本的管理和升级，并方便在插件之间进行切换。

## **切入点**

1. 共享React-Native sdk

   - 插件工程里面用provided方式进行依赖，避免重复把SDK打进插件包
   - 基座容器集成SDK，提供React Native的运行环境

2. 共享公共的组件包

   - 从插件包中剔除react，react-native等基础模块
   - 单独构建包含公共组件的common.bundle包

3. 动态加载插件包

   - 预先加载包含公共组件的common.bundle，初始化上下文，

   - 使用预先初始化的上下文来动态加载插件

     ​

由基座提供公共的SDK给插件使用，技术上与常用的Android共享依赖的方式无异。这里不做讨论。

下面，我们来研究一下如果共享公共的组件包。共享的第一步，我们需要争取的设计我们的公共包，以及分离的方法。

## **分离公共组件和业务包**

**一个正常的ReactNative的JS包结构**:

![](rn/bundlelook.png)

完整的ReactNative包包含三个部分：Polyfills，模块声明，程序入口。

- 填充的头部： Polyfills

```javascript
!function(){}
!function(){}
!function(){}
!function(){}
!function(){}
//11个
```

- ModuleDeclaration

```javascript
__d(function(){}, 0); 
__d(function(){}, 12);
__d(function(){}, 13);
__d(function(){}, 14);
...
//react native公共的模块大致到270
...
//自定义的模块
__d(function(){}, 271);
__d(function(){}, 272);
```

- 程序入口：ModuleCall

```javascript
;require(64); //64 is the moduleId of IlitializeCore
;require(0);  //0 is the moduleId entry module
```

**怎样设计公共包和插件包**


头部和程序入口的内容都是比较固定；而自定义的模块和组件，与react-native提供的公共组件一起，都包含在模块声明这个部分。所以，我们是否考虑将自定义的模块声明分离到插件包，头部、程序入口和react-native的公共模块都包含到公共包里面呢？这样，就可以让插件包变得非常轻量和干净。

作为一个容器应用，除了提供运行时环境，我们往往也需要提供一些定制化的公共组件，比较下拉列表，Loading动画，路由等等，而这些东西，我们也完全可以打到公共包里面，提供给插件调用，避免每个插件去重复的定义。

所以，基于以上考虑，我们的公共包和插件包可以这样分离：

| 公共包                                  |            插件包            |
| ------------------------------------ | :-----------------------: |
| 填充的头部： Polyfills                     |             -             |
| ModuleDeclaration： react native公共的模块 |             -             |
| ModuleDeclaration：自定义的公共模块           | ModuleDeclaration：插件相关的模块 |
| 程序入口:ModuleCall                      |             -             |



对于所有的插件包，我们的Polyfills，react native公共组件，定制化的公共组件，和程序入口都应该只有一份。
   

那么我们怎样分离公共组件和业务包呢？

**怎样打包**

三种打包手段：

- 侵入RN代码，修改打包流程，使得打出来的包就是基础+业务包，如QQ音乐

  - 优点：灵活性强
  - 缺点：RN版本升级会是个很大的风险

- 在RN打包的基础上，实现新的打包方案，如携程 moles-Packer

  - 优点：可以自定义包的结构，灵活性强

  - 缺点：需要开发和维护打包工具

- Patch方案，打包流程不变，生成基础包后，根据diff来生成每个业务不同的patch包

  - 优点：实现最简单，打包方式不变，增加diff就可以

  - 缺点：该方法本身并和我们期望的打包粒度就不一致，如果打包业务包和公共包时，因为某种原因，diff得到的并不就是插件的模块声明，将会导致非常严重的错误。



对比以上三种方案，相对而言第二种方案的可靠性比较高（RN打包的基础上，实现新的打包方案），一方面可以避开因为RN升级造成的困扰，另一方面，我们也可以深入到模块内部，定制自己的打包规则，灵活性较高。这个方案在业内也已经有了比较成熟的方案，比如携程的moles-Packer，在业内颇受推崇。

但这个方案也有它的局限：

> - Moles-Packer 是携程开源的打包方案，需要与Mole框架结合使用，但Mole框架目前不开源。
> - Moles-Packer 有版本局限，目前只支持到RN0.37的版本，而截止目前，RN的版本已经更新到RN0.48。
> - Moles-Packer 已经无人维护，截止目前已经超过9个月没有更新。
> - Moles-Packer 需要与Moles框架结合使用

现在我们已经确认了我们的打包的目标，以及可参照的方案，我们能不能维护一套自己的打包工具呢？

**打包的实现**

分离公共包和业务包的时候，有两个关键点需要考虑：

- 打插件包的时候，怎样知道公共包的里面对应module的moduleId

  JS程序之间的调用依赖moduleId进行索引，但如果插件不能准确的知道公共包里面module与moduleId的对应关系，将会导致运行错误。

- 怎样保证插件之间不会重复moduleId

  用过公共的配置表，我们可以避免插件包与公共包的moduleId不重复，但是moduleId如果是一个自增长的数值，依然无法保障插件之间的Id不会重复。

  比如，我们的公共包里面使用了0到300的Id，插件打包时候读取到这个信息，可从301开始自增长，使用300之后的数字作为Id，假设插件A使用了300到400之间的Id，那么怎样让插件B避免也使用300到400之间的Id呢？

针对以上两个问题，可以这样应对：

- 在插件之间共享公共的配置表，保存module和ModuleId的映射信息。

  这个思路，在Moles-Packer打包的流程里面也有体现。

  但Moles-Packer不只是做了module与moduleId的映射表，在react-native平台打包的结果之上，又加入了一些自己的玩法：

  > - 根据模板生成公共包的入口文件
  > - 读入react-native平台直接打包的结果，然后逐行处理后重新写文件
  > - 合并Android iOS的同名module
  > - 采用crypto对module.shortname和version进行加密作为module的hash值，把对应关系保存sourcemap
  > - 在包的尾部增加hash值与moduleId的对照表
  > - 采用uglify-js对代码进行混淆
  > - 模块定义转amd规范
  >

  Moles-Packer的module与Id的映射关系：

  ![](rn/moles-map.png)


  给我们的借鉴：

  通过这种方式，Moles-Packer确保了moduleId与module的一一对应关系。同时，也保障了代码的安全，避免代码被反编译。


- 怎样保证插件之间不会重复moduleId？

  关于这个问题，Moles-Packer并没有提供具体的方案。但我们可以在这个方案之上，去定制自己的moduleId的生成的规则。ModuleId可以是数字，其实也可以是字符串。所以，这里Moles-Packer的通过hash字符串来桥接Module与ModuleId完全没有必要。

  这里，我们可以继续简化这个方案：比如，用HashCode来作为moduleId，而不是数字。

  ![](rn/moles-map-simplified.png)

  另外，生成moduleId的因子，一定要用name+version吗？我们能不能给它增加前缀或者规定格式呢？比如，包含module更多的信息，比如module的类型，插件名称，path等。

  ```
  _md5(type + bundleName + path )
  ```

  通过这种方式，我们不仅可以解决Id重复的问题，同时，也打开了另一扇窗，插件间的路由。


## **插件之间的路由**

  当我们的粒度细化到module，可以用ModuleId索引到任意module，而且这个module可以一个应用，或者一个页面，甚至可能是一个组件，一个方法，一个声明的时候，插件之间的路由变得非常的容易。

  因为对于插件平台来说，所有的组件都已经通过Id拉平，可以任意的获取或者加载到任意的module。只要它知道```type + bundleName + path```

  RN插件之间资源的加载，在JS代码里面我们可以这样索引：

  ```Javascript
//使用requireJS做资源的延迟加载
require(type + bundleName + path, ()=>{})
  ```

  原生代码路由到指定的module，ReactNative其实已经提供了方法：

  ```Java
  String moduleId = type + bundleName + path;
  Bundle bundle = new Bundle();
  bundle.putString("moduleId", moduleId);
  mReactRootView.startReactApplication(reactInstanceManager, "ShellApp", bundle);
  ```

  RN插件到原生，似乎并没有现成的办法，不过我们可以定义自己的NativeModule作为公共的原生组件加载到容器上，暴露给供所有的RN插件调用：

```Java
  public class RNRouterReactPackage extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    public RNRouterReactPackage(ReactApplicationContext reactContext) {
      super(reactContext);
      this.reactContext = reactContext;
    }
    @Override
    public String getName() {
      return "RNdRouter";
    }
    @ReactMethod
    public void open(String uri, Promise promise) {
      Log.d("RNRouterReactPackage", "open called with params: " + uri);
      try {
          //open some page
          Intent intent = new Intent(reactContext, parseUri(uri));
          startActivityForReasult(intent);
          WritableMap map = Arguments.createMap();
          promise.resolve(map);
      } catch (Exception e) {
          promise.reject(e);
      }
    }
  }
```

```Javascript
//js中引用
RNdRouter.open(type + bundleName + path)
.then(()=>{
})
.catch(()=>{
});
```



**平台差异**

以上的打包方案对Android与iOS平台均适用。但毕竟Android和iOS存在一些不同的组件引用，这里，我们可以通过在公共包里面提供通用组件，抹平平台差异。

![componens.png](rn/componens.png)


**基于moles-packer方案的改造**

需要做些什么：

1. 支持新的react native版本
2. 制定生成moduleId的规则
3. 封装易于使用的脚本
4. 定制可配置的打包规则，比如可以规定source目录下shared的components都打入公共包，以及规定业务包的入口文件和目录等。





## **动态加载**

动态加载插件是插件化方案必不可缺的一环。因为react native技术已经提供了动态加载的方法，所以，这里我们需要思考的是，如何能更加优雅的进行动态加载。至少可以考虑两个点：

- 如何预先加载公共组件
- 动态加载插件

**认识RN应用启动过程**：

![rn-launch.png](rn/rn-launch.png)

涉及的模块：

| 类                       | 功能                                       |
| ----------------------- | ---------------------------------------- |
| ReactActivity           | Android应用入口                              |
| ReactActivityDelegate   | 关联Activity的生命周期                          |
| ReactNativeHost         | 一个ReactNative应用的基本信息：入口文件，NativeModules, MainModuleName, ReactInstanceManager， |
| ReactRootView           | 显示ReactNative程序的容器                       |
| ReactInstanceManager    | 创建ReactApplicationContext                |
| ReactApplicationContext | 上下文：MessageQueue,  LifecycleState, mActivityEventListeners |
| CatalystInstance        | 操作ReactApplicationContext（mJSModuleRegistry，PendingJSCall，mNativeModuleRegistry initializeBridge |

**选择HOOK点**

ReactApplicationContext和CatalystInstance是React和Native之间通信的核心，ReactApplicationContext作为运行环境上下文的wrapper，而CatalystInstance维护着运行环境下消息队列的读取和React Native程序的执行。如果是对CatalystInstance进行改造，开发和维护成本会比较高，而且因为版本的升级会是个很大的风险。

另一方面，ReactNative应用不一定需要需要包在Activity里面，我们没必要去hook这个ReactActivity。对每一个插件生成一个host来管理插件的基本信息，似乎问题不大，但是否每个插件都生成一个新的ReactInstanceManager呢？经验证，这个也没有必要的。

ReactRootView是显示React native应用的容器，这个必不可少。ReactInstanceManager用来创建上下文，关联ReactRootView，管理运行时状态，我们可以针对它进行改造，封装适当的接口。

CatalystInstance动态加载的方法：extendNativeModules 和 loadScriptFromFile ，但可惜我们并不能在直接获取到CatalystInstanceImp的对象，也访问不到loadScriptFromFile方法，这里，可以通过反射来实现。具体使用见demo。但是，这样操作会让调用关系非常混乱，容易让开发者迷惑。

综上考虑，我们可以从两个点入手：

- 为插件提供RNBundleDeleagate接口，绑定ReactRootView，提供插件的基本信息和加载，供插件去实现，但不限定为Activity还是Fragment。
- 改造现有的ReactInstanceManager，封装loadBundle, extendNativeModules， startBundle等方法，避免直接暴露CatalystInstance对象和ReactContext。

![relationship.png](rn/relationship.png)

**预先初始化**

在初始化上下文的时候，可以类似正常ReactNative应用的启动过程，但这里，我们可以不用创建ReactRootView：

- 加载公共的NativeModules

- 加载公共的JS组件

- 初始化上下文

- 预置状态

  ![preload.png](rn/preload.png)

**插件的动态加载**

插件的动态加载应该包含以下动作：

- 加载插件的NativeModules

- 加载插件的JS bundle

- 创建ReactRootView

- 通过ReactRootView启动对应模块

  ![load_bundle.png](rn/load_bundle.png)



## **公共组件 VS Shell程序**？

如果仅仅是为插件提供依赖的公共组件，我们的可以写一个仅用来包含以下内容的common.js：

```
import React from 'react';
import {} from 'react-native';
```

然后以该文件作为entry-file进行打包：

```Shell
react-native bundle --platform android --dev false --entry-file common.js --bundle-output common.bundle
```

这样就可以打出来包含公共组件的common.bundle。但是，这样我们仅仅得到一堆散乱的module，每个插件是不同的App。弊端：

- 这意味着每次路由我们必须通过原生的容器来中转，因为要通过JSBridge，所以开销也比较大。
- 不符合前面我们拆包的设计，即，插件包仅提供ModuleDefinition。
- 不利于扩展，比如优化启动，或者是初始化（例如Redux的store）

处于以上考虑，尤其是扩展性，这里建议把common.js作为所有RN插件的壳应用。

```javascript
import React, { Component } from 'react';
import {
    AppRegistry,
    View
} from 'react-native';

export default class app extends Component {
    render() {
        const LoadedModule = require(this.props.moduleId);
        return <LoadedModule />
    }
}
AppRegistry.registerComponent('ShellApp', () => app);
```

在载入插件的业务包后，打开相应的module。

```Java
Bundle bundle = new Bundle();
bundle.putString("moduleId", getMainModuleName());
mReactRootView.startReactApplication(reactInstanceManager, "ShellApp", bundle);
```

所以，通过前面的方法，我们把整个容器变成了一个ReactNative应用，而插件只是因为业务的相关性，一堆ModuleDefinition的聚合而已，我们可以通过moduleId来做精准的索引和路由，不管是原生到RN插件之间，还是RN插件之间，都可以用这一套方案。带来的好处：

- 方便集中对容器应用做优化
- 路由灵活：通过moduleId我们抹平了插件的差异，对于容器来说，它看到的不只是插件，而且可以通过配置表看见所有的页面，甚至不止页面，而是所有的组件，从而可以更方便进行跨插件的操作。

完整示例代码见demo.

