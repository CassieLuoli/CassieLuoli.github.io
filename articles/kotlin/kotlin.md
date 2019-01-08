# 构建 Kotlin 项目
本附录阐明了如何使用 Gradle，Maven 和 Ant 来构建 Kotlin 代码的项目，也涵盖了如何构建 Kotlin 的 Android 应用。

## A.1用Gradle构建 Kotlin 代码的项目

构建 Kotlin 项目的推荐系统是 Gradle。 Gradle 是 Android 项目的标准构建系统，它还支持可以使用 Kotlin 的所有其他类型的项目。 Gradle具有灵活的项目模型，因为支持增量构建，长期构建过程（Gradle 守护进程）和其他高级技术，因此可以提供出色的构建性能。

Gradle 团队正在努力支持用 Kotlin 编写 Gradle 构建脚本，这将允许使用相同的语言编写应用程序及其构建脚本。 在本文的编写过程中，这项工作仍在进行。 你可以在https://github.com/gradle/gradle-script-kotlin 找到有关的更多信息。 在本书中，我们使用 Groovy 语法来编写 Gradle 构建脚本。

构建 Kotlin 项目的标准 Gradle 构建脚本如下所示：

```
buildscript {
    //指定要用的Kotlin的版本
    ext.kotlin_version = '1.0.6'
    repositories {
        mavenCentral()
    }
    dependencies {
        //给Kotlin Gradle插件增加构建脚本的依赖
        classpath "org.jetbrains.kotlin:" +
            "kotlin-gradle-plugin:$kotlin_version"
    }
}
apply plugin: 'java'
apply plugin: 'kotlin'

repositories {
    mavenCentral()
 }
dependencies {
    //给Kotlin 标准库增加依赖
    compile "org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version"
}
```
脚本在以下位置查找 Kotlin 源文件：
* 代码源文件位置： src/main/java 和 src/main/kotlin
* 测试源文件位置：src/test/java 和 src/test/kotlin

在大多数情况下，推荐将 Kotlin 和 Java 源文件放在同一目录中。 尤其是当你把 Kotlin 引入现有项目时，使用单个源文件目录可以在减少 Java 文件转换为 Kotlin 的阻力。

如果你使用了 Kotlin 反射，则需要另外添加一个依赖关系：Kotlin 反射库。 为此，请在 Gradle 构建脚本的 `dependencies`中添加以下内容：
```
compile "org.jetbrains.kotlin:kotlin-reflect:$kotlin_version"
```
### A.1.1 用 Gradle 来构建 Kotlin Android 应用

和普通的 Java 应用相比，Android 应用使用了不同的构建过程，所以需要使用不同的 Gradle 插件来构建。不是添加`apply plugin: 'kotlin'`，你需要把下面的代码添加到构建脚本中：
```
apply plugin: 'kotlin-android'
```
如果你喜欢把 Kotlin 源代码放在特定目录下（如src/main/kotlin）中，则需要注册它们，以便 Android Studio 识别它们为源目录。你可以用以下代码段来实现：
```
android {
    ...
    sourceSets {
        main.java.srcDirs += 'src/main/kotlin'
} }
```
### A.1.2 构建需要处理注解的项目

许多 Java 框架，特别是在 Android 开发中使用框架，都依赖注解处理在编译时生成代码。 要在 Kotlin 中使用这些框架，你需要在构建脚本中启用 Kotlin 注解处理。 可以通过添加下面的代码来实现：
```
apply plugin: 'kotlin-kapt'
```
如果你试图引入 Kotlin 到现有的一个使用注解处理的 Java 项目，那么需要删除 `apt` 工具的现有配置。Kotlin 注解处理工具包含了 Java 和 Kotlin 类的处理，如果同时有两个单独的注解处理工具会很多余。 可以使用 `kapt` 依赖配置来配置注解处理所需的依赖关系：
```
 dependencies {
    compile 'com.google.dagger:dagger:2.4'
    kapt 'com.google.dagger:dagger-compiler:2.4'
}
```
如果你对 `androidTest` 或  `test` 使用注解处理器，则对应的 `kapt` 配置应该分别为 `kaptAndroidTest` 和 `kaptTest`。

## A.2 使用Maven来构建Kotlin项目
如果你喜欢使用Maven来构建项目，Kotlin也是支持的。最简便的方式是使用`org.jetbrains.kotlin: kotlin-archetype-jvm`原型来创建 Kotlin 的 Maven 项目。对于现有的Maven项目，你可以简单地通过在项目的 Kotlin IntelliJ IDEA 插件里选择 Tools > Kotlin > Configure Kotlin 添加对 Kotlin 的支持。

要手动地给Kotlin项目添加Maven的支持，需要执行以下步骤：

- 1. 在Kotlin的标准库上添加依赖(group ID：`org.jetbrains.kotlin`，artifact ID：` kotlin-stdlib`)。
- 2. 添加 Kotlin 的 Maven 的插件(group ID：`org.jetbrains.kotlin`， artifact ID： `kotlin-maven-plugin`)，并配置它在`compile`和`test-compile`阶段执行。
- 3. 如果你喜欢把 Kotlin 代码和 Java 的源代码根目录分开，配置源文件目录。

出于空间的关系，在这里我们就不展示完整的pom.xml示例了，你可以在在线文档中找到它们，网址为：https://kotlinlang.org/docs/reference/using-maven.html 。

在混合的 Java / Kotlin 项目中，你需要配置 Kotlin 插件，以便它在 Java 插件之前运行。 这个很有必要。因为 Kotlin 插件可以解析 Java 源代码，而 Java 插件只能读取 .class 文件； 因此，将 Kotlin 文件编译为 .class 需要在 Java 插件运行之前。你可以在http://mng.bz/73od 上找到如何配置的示例。

## A.3 用 Ant 来构建 Kotlin 代码

Kotlin 提供了两种任务来使用Ant构建项目：`<kotlinc>`任务用于编译纯 Kotlin 的模块，而 `<withKotlin>`作为`<javac>`的扩展用于构建混合的 Kotlin / Java 模块。这里是使用`<kotlinc>`的一个最小示例：
```
<project name="Ant Task Test" default="build">
    <!-- 定义<kotlinc>任务 -->
    <typedef resource="org/jetbrains/kotlin/ant/antlib.xml"
             classpath="${kotlin.lib}/kotlin-ant.jar"/>
    <target name="build">
        <!-- 用<kotlinc>构建一个单源代码目录的，并打包结果到一个jar文件 -->
        <kotlinc output="hello.jar">
            <src path="src"/>
        </kotlinc>
    </target>
</project>
```
Ant 任务`<kotlinc>`会自动添加标准库的依赖，所以你不必在配置时添加额外的参数。它也支持打包编译的 .class 文件到一个 jar 文件。
这里是一个使用` <withKotlin>`任务来构建一个混合的 Java / Kotlin 模块的示例：
```
<project name="Ant Task Test" default="build">
    <!-- 定义<withKotlin>任务 -->
    <typedef resource="org/jetbrains/kotlin/ant/antlib.xml"
             classpath="${kotlin.lib}/kotlin-ant.jar"/>
    <target name="build">
        <javac destdir="classes" srcdir="src">
            <!-- 使用<withKotlin>任务来允许混合的 Kotlin / Java编译 -->
            <withKotlin/>
        </javac>
        <!-- 打包编译的.class文件到一个jar文件 -->
        <jar destfile="hello.jar">
            <fileset dir="classes"/>
        </jar>
    </target>
</project>
```
和`<kotlinc> `不同的是，`<withKotlin>`并不支持自动打包编译的类，所以这个示例里单独使用了`<jar>`任务来打包。

