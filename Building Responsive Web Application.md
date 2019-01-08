Building Responsive Web Application

1. adaptive width. Insert code followed in to HTML header

   ```
   <meta name="viewport" content="width=device-width, initial-scale=1" />
   ```

   All popular browser support this, including IE9. 

   To support in IE6, 7,8. Using [css3-mediaqueries.js](https://link.juejin.im/?target=http%3A%2F%2Fcode.google.com%2Fp%2Fcss3-mediaqueries-js%2F)
     ```
   　　<!--[if lt IE 9]>
   　　　　<script src="http://css3-mediaqueries-js.googlecode.com/svn/trunk/css3-mediaqueries.js"></script>
   　　<![endif]-->
   　
     ```

2. No absolute width layout and absolute element.

   ```
   width: xx%;
   width: auto;
   ```




3. Font. No px, only em or rem.

   ```
   body {
   　　　　font: normal 100% Helvetica, Arial, sans-serif;
   　　}
   ```

   ```
   h1 {
   　　　　font-size: 1.5em;  //16 * 1.5 = 24px
   　　}
   ```

4. fluid grid

   No fixing. [float](https://link.juejin.im/?target=http%3A%2F%2Fdesignshack.net%2Farticles%2Fcss%2Feverything-you-never-knew-about-css-floats%2F)

   Be cautious about (`position: absolute`)

   ```
   　　.main {
   　　　　float: right;
   　　　　width: 70%; 
   　　}

   　　.leftBar {
   　　　　float: left;
   　　　　width: 25%;
   　　}
   ```

5. Different css. Import [Media Query](https://link.juejin.im/?target=http%3A%2F%2Fwww.w3.org%2FTR%2FCSS21%2Fmedia.html)

   ```
   　　<link rel="stylesheet" type="text/css"
   　　　　media="screen and (max-device-width: 400px)"
   　　　　href="tinyScreen.css" />
   ```

   ```
   　　<link rel="stylesheet" type="text/css"
   　　　　media="screen and (min-width: 400px) and (max-device-width: 600px)"
   　　　　href="smallScreen.css" />
   ```

   Except import in html headers, use css

   ```
   @import  url("tinyScreen.css") screen and (max-device-width: 400px);
   ```

6. Css @media

   ```
   @media  screen and (max-device-width: 400px) {
   　　　　.column {
   　　　　　　float: none;
   　　　　　　width:auto;
   　　　　}

   　　　　#sidebar {
   　　　　　　display:none;
   　　　　}
   　　}
   ```

7. Fluid image

   [自动缩放](https://link.juejin.im/?target=http%3A%2F%2Funstoppablerobotninja.com%2Fentry%2Ffluid-images)

   [imgSizer.js](https://link.juejin.im/?target=http%3A%2F%2Funstoppablerobotninja.com%2Fdemos%2Fresize%2FimgSizer.js)

   ```
   img { max-width: 100%;}

   img, object { max-width: 100%;}

   // old IE version no max-width.so....
   img { width: 100%; }
   // for windows
   img { -ms-interpolation-mode: bicubic; }
   ```


   or: imgSizer.js
   　　addLoadEvent(function() {

   　　　　var imgs = document.getElementById("content").getElementsByTagName("img");

   　　　　imgSizer.collate(imgs);

   　　});

