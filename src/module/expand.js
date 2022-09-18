define(function (require, exports, module) {
  var kity = require("../core/kity");
  var utils = require("../core/utils");
  var keymap = require("../core/keymap");
  var MinderNode = require("../core/node");
  var Command = require("../core/command");
  var Module = require("../core/module");
  var Renderer = require("../core/render");

  Module.register("Expand", function () {
    var minder = this;
    var EXPAND_STATE_DATA = "expandState",
      STATE_EXPAND = "expand",
      STATE_COLLAPSE = "collapse";

    // 将展开的操作和状态读取接口拓展到 MinderNode 上
    kity.extendClass(MinderNode, {
      /**
       * 展开节点
       * @param  {Policy} policy 展开的策略，默认为 KEEP_STATE
       */
      expand: function () {
        this.setData(EXPAND_STATE_DATA, STATE_EXPAND);
        return this;
      },

      /**
       * 收起节点
       */
      collapse: function () {
        this.setData(EXPAND_STATE_DATA, STATE_COLLAPSE);
        return this;
      },

      /**
       * 判断节点当前的状态是否为展开
       */
      isExpanded: function () {
        var expanded = this.getData(EXPAND_STATE_DATA) !== STATE_COLLAPSE;
        return expanded && (this.isRoot() || this.parent.isExpanded());
      },

      /**
       * 判断节点当前的状态是否为收起
       */
      isCollapsed: function () {
        return !this.isExpanded();
      },
    });

    /**
     * @command Expand
     * @description 展开当前选中的节点，保证其可见
     * @param {bool} justParents 是否只展开到父亲
     *     * `false` - （默认）保证选中的节点以及其子树可见
     *     * `true` - 只保证选中的节点可见，不展开其子树
     * @state
     *   0: 当前有选中的节点
     *  -1: 当前没有选中的节点
     */
    var ExpandCommand = kity.createClass("ExpandCommand", {
      base: Command,

      execute: function (km, justParents) {
        var node = km.getSelectedNode();
        if (!node) return;
        if (justParents) {
          node = node.parent;
        }
        while (node.parent) {
          node.expand();
          node = node.parent;
        }
        node.renderTree();
        km.layout(100);
      },

      queryState: function (km) {
        var node = km.getSelectedNode();
        return node && !node.isRoot() && !node.isExpanded() ? 0 : -1;
      },
    });

    /**
     * @command ExpandToLevel
     * @description 展开脑图到指定的层级
     * @param {number} level 指定展开到的层级，最少值为 1。
     * @state
     *   0: 一直可用
     */
    var ExpandToLevelCommand = kity.createClass("ExpandToLevelCommand", {
      base: Command,
      execute: function (km, level) {
        km.getRoot().traverse(function (node) {
          if (node.getLevel() < level) node.expand();
          if (node.getLevel() == level && !node.isLeaf()) node.collapse();
        });
        km.refresh(100);
      },
      enableReadOnly: true,
    });

    /**
     * @command Collapse
     * @description 收起当前节点的子树
     * @state
     *   0: 当前有选中的节点
     *  -1: 当前没有选中的节点
     */
    var CollapseCommand = kity.createClass("CollapseCommand", {
      base: Command,

      execute: function (km) {
        var node = km.getSelectedNode();
        if (!node) return;

        node.collapse();
        node.renderTree();
        km.layout();
      },

      queryState: function (km) {
        var node = km.getSelectedNode();
        return node && !node.isRoot() && node.isExpanded() ? 0 : -1;
      },
    });

    var Expander = kity.createClass("Expander", {
      base: kity.Group,

      constructor: function (node) {
        this.commonColor = "#7262FD";
        this.callBase();
        const plusPaths =
          "M290 448 H896v85.333333H290.133333l132.266667 132.266667L362.666667 725.333333 128 490.666667 362.666667 256l59.733333 59.733333-132.266667 132.266667z";

        const arrorPaths =
          "m6.41634,0.38992l-6.0613,6.65509c-0.47338,0.51976 -0.47338,1.36231 0,1.88207l6.0613,6.65509c0.47338,0.51976 1.24076,0.51976 1.71414,0s0.47338,-1.36231 0,-1.88207l-3.99199,-4.38306l11.62073,0c0.66978,0 1.21227,-0.59564 1.21227,-1.33103s-0.5425,-1.33103 -1.21227,-1.33103l-11.62073,0l3.99199,-4.38306c0.23641,-0.25954 0.35519,-0.60029 0.35519,-0.94105s-0.11819,-0.68148 -0.35519,-0.94105c-0.47338,-0.51976 -1.24076,-0.51976 -1.71414,0l0,0.0001z";
        this.radius = 10;
        //this.box = new kity.Rect(30, 20, 90, -10, 10).fill("red");
        this.box = new kity.Rect(30, 20, -5, -10, 10)
          .fill(this.commonColor)
          .setTranslate(-4, 0);
        this.text = new kity.Text(node.getComplex() - 1)
          .setPosition(2, 4)
          .fill("white")
          .setStyle({
            "font-size": 12,
          });
        // 收起的时候展示
        this.hideSign = [this.box, this.text];
        this.outline = new kity.Circle(this.radius)
          .stroke("gray")
          .fill(this.commonColor);
        this.sign = new kity.Path(arrorPaths)
          .fill("white")
          .setTranslate(-8, -8);
        // 展开的时候
        this.expandSign = [this.outline, this.sign];

        this.addShapes(this.expandSign);
        this.initEvent(node);
        this.setId(utils.uuid("node_expander"));
        this.setStyle("cursor", "pointer");
      },

      initEvent: function (node) {
        this.on("mousedown", function (e) {
          minder.select([node], true);
          if (node.isExpanded()) {
            node.collapse();
          } else {
            node.expand();
          }
          node.renderTree().getMinder().layout(100);
          node.getMinder().fire("contentchange");
          e.stopPropagation();
          e.preventDefault();
        });
        this.on("dblclick click mouseup", function (e) {
          e.stopPropagation();
          e.preventDefault();
        });
      },

      setState: function (state) {
        if (state == "hide") {
          this.setVisible(false);
          return;
        }
        this.setVisible(true);
        var pathData = ["M", 1.5 - this.radius, 0, "L", this.radius - 1.5, 0];
        if (state == STATE_COLLAPSE) {
          pathData.push(["M", 0, 1.5 - this.radius, "L", 0, this.radius - 1.5]);
        }
        // this.removeShapes(this.hideSign);
        // this.addShapes(this.expandSign);
        this.clear();
        this.addShapes(
          state == STATE_COLLAPSE ? this.hideSign : this.expandSign
        );
      },
    });

    var ExpanderRenderer = kity.createClass("ExpanderRenderer", {
      base: Renderer,

      create: function (node) {
        if (node.isRoot()) return;
        this.expander = new Expander(node);
        node.getRenderContainer().prependShape(this.expander);
        node.expanderRenderer = this;
        this.node = node;
        return this.expander;
      },

      shouldRender: function (node) {
        return !node.isRoot();
      },

      update: function (expander, node, box) {
        if (!node.parent) return;

        var visible = node.parent.isExpanded();

        expander.setState(
          visible && node.children.length
            ? node.getData(EXPAND_STATE_DATA)
            : "hide"
        );

        var vector = node
          .getLayoutVectorIn()
          .normalize(expander.radius + node.getStyle("stroke-width"));
        var position = node.getVertexOut().offset(vector);
        this.expander.setTranslate(position);
      },
    });

    return {
      commands: {
        expand: ExpandCommand,
        expandtolevel: ExpandToLevelCommand,
        collapse: CollapseCommand,
      },
      events: {
        layoutapply: function (e) {
          var r = e.node.getRenderer("ExpanderRenderer");
          if (r.getRenderShape()) {
            r.update(r.getRenderShape(), e.node);
          }
        },
        beforerender: function (e) {
          var node = e.node;
          var visible = !node.parent || node.parent.isExpanded();
          var minder = this;

          node.getRenderContainer().setVisible(visible);
          if (!visible) e.stopPropagation();
        },
        "normal.keydown": function (e) {
          if (this.getStatus() == "textedit") return;
          if (e.originEvent.keyCode == keymap["/"]) {
            var node = this.getSelectedNode();
            if (!node || node == this.getRoot()) return;
            var expanded = node.isExpanded();
            this.getSelectedNodes().forEach(function (node) {
              if (expanded) node.collapse();
              else node.expand();
              node.renderTree();
            });
            this.layout(100);
            this.fire("contentchange");
            e.preventDefault();
            e.stopPropagationImmediately();
          }
          if (e.isShortcutKey("Alt+`")) {
            this.execCommand("expandtolevel", 9999);
          }
          for (var i = 1; i < 6; i++) {
            if (e.isShortcutKey("Alt+" + i)) {
              this.execCommand("expandtolevel", i);
            }
          }
        },
      },
      renderers: {
        outside: ExpanderRenderer,
      },
      contextmenu: [
        {
          command: "expandtoleaf",
          query: function () {
            return !minder.getSelectedNode();
          },
          fn: function (minder) {
            minder.execCommand("expandtolevel", 9999);
          },
        },
        {
          command: "expandtolevel1",
          query: function () {
            return !minder.getSelectedNode();
          },
          fn: function (minder) {
            minder.execCommand("expandtolevel", 1);
          },
        },
        {
          command: "expandtolevel2",
          query: function () {
            return !minder.getSelectedNode();
          },
          fn: function (minder) {
            minder.execCommand("expandtolevel", 2);
          },
        },
        {
          command: "expandtolevel3",
          query: function () {
            return !minder.getSelectedNode();
          },
          fn: function (minder) {
            minder.execCommand("expandtolevel", 3);
          },
        },
        {
          divider: true,
        },
      ],
    };
  });
});
