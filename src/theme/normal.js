define(function (require, exports, module) {
  var theme = require("../core/theme");
  var commonFontColor = "#262626";
  var commonBkColor = "#f1f1f4";
  var commonFontSize = 14;
  var commonColor = "#7262FD";

  // 连接线style variable
  var connectColor = "#BFBFBF";
  var connectWidth = 2;
  var connectRadius = 8;

  var marqueeBkColro = "rgba(114, 98, 253, 0.1)";

  theme.register("normal", {
    background: "#fff",

    "root-color": "#fff",
    "root-background": "#7262FD",
    "root-stroke": "#fff", // 节点边框颜色
    "root-font-size": 24,
    "root-padding": [12, 16],
    "root-margin": 30,
    "root-radius": 4,
    "root-space": 10,
    // "root-shadow": "rgba(0, 0, 0, .25)",

    "main-color": commonFontColor,
    "main-background": commonBkColor,
    "main-stroke": "white",
    "main-font-size": commonFontSize,
    "main-padding": [8, 12],
    "main-margin": [20, 0, 20, 20],
    "main-radius": 6,
    "main-space": 5,
    // "main-shadow": "rgba(0, 0, 0, .25)",

    "sub-color": commonFontColor,
    "sub-background": commonBkColor,
    "sub-stroke": "white",
    "sub-font-size": commonFontSize,
    "sub-padding": [8, 12],
    "sub-margin": [20, 20],
    "sub-radius": 5,
    "sub-space": 5,

    "connect-color": connectColor,
    "connect-width": connectWidth,
    "main-connect-width": connectWidth,
    "connect-radius": 100,

    // "selected-background": "rgb(254, 219, 0)",
    "selected-stroke": commonColor, // 选中节点边框颜色
    "selected-stroke-width": 2, // 选中节点边框宽度

    "marquee-background": marqueeBkColro,
    // "marquee-stroke": "white",

    "drop-hint-color": commonColor,
    "drop-hint-width": 2,

    "order-hint-area-color": "#E1DFFF",
    "order-hint-path-color": commonColor,
    "order-hint-path-width": 0,

    "text-selection-color": "#E1DFFF",
    "line-height": 1.5,
  });
});
