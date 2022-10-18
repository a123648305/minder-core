define(function (require, exports, module) {
  var kity = require("../core/kity");
  var utils = require("../core/utils");
  var MinderNode = require("../core/node");
  var Command = require("../core/command");
  var Module = require("../core/module");

  // 矩形的变形动画定义
  var MoveToParentCommand = kity.createClass("MoveToParentCommand", {
    base: Command,
    execute: function (minder, nodes, parent) {
      var node;
      for (var i = 0; i < nodes.length; i++) {
        node = nodes[i];
        if (node.parent) {
          node.parent.removeChild(node);
          parent.appendChild(node);
          node.render();
        }
      }
      parent.expand();
      minder.select(nodes, true);
    },
  });

  var DropHinter = kity.createClass("DropHinter", {
    base: kity.Group,

    constructor: function () {
      this.callBase();
      this.rect = new kity.Rect();
      this.addShape(this.rect);
    },

    render: function (target) {
      this.setVisible(!!target);
      if (target) {
        this.rect
          .setBox(target.getLayoutBox())
          .setRadius(target.getData('border-radius') || target.getStyle("radius") || 0)
          .stroke(
            target.getStyle("drop-hint-color") || "yellow",
            target.getStyle("drop-hint-width") || 2
          );
        this.bringTop();
      }
    },
  });

  var SourceHinter = kity.createClass("SourceHinter", {
    base: kity.Group,

    constructor: function () {
      this.callBase();
      // 宽,高,左间距,上间距,圆角
      this.area = new kity.Rect(64, 24, 0,0, 4)
      this.areas = new kity.Rect(64, 24, 0,0, 4)
      this.addShapes([this.area, this.areas]);
    },

    render: function (number, x, y, rootBox) {
      if(!number) {
        this.area.setBox({x:0, y: 0, width: 0, height: 0})
        this.areas.setBox({x:0, y: 0, width: 0, height: 0})
        return
      }
      if (number > 1) {
        const box = {
          width: 58,
          height: 18,
          x: 0,
          y: 0
        }
        // 一个上面,一个下面
        this.area.setBox(box).setPosition(x - 32 - 3, y - 12 - 3).fill("rgba(114,98,253,0.2)");
        this.areas.setBox(box).setPosition(x - 32 + 3, y - 12 + 3).fill("rgba(114,98,253,0.2)");
      } else if (number > 0){
        this.area.setBox({width: 64, height: 24, 
          x: 0,
          y: 0}).setPosition(x - 32, y - 12).fill("rgba(114,98,253,0.2)");
      }
      // 节点位置减去根节点的偏移量
      this.box = {
        width: 64,
        height:24,
        left: x - 32,
        top: y - 12,
      }
      this.box.right = this.box.left + 64
      this.box.bottom = this.box.top + 24
      this.box.center = {
        x: (this.box.left + this.box.right) /2 ,
        y: (this.box.top + this.box.bottom) /2 ,
      }
      this.bringTop();
    },
  });

  // 对拖动对象的一个替代盒子，控制整个拖放的逻辑，包括：
  //    1. 从节点列表计算出拖动部分
  //    2. 计算可以 drop 的节点，产生 drop 交互提示
  var TreeDragger = kity.createClass("TreeDragger", {
    constructor: function (minder) {
      this._minder = minder;
      this._dropHinter = new DropHinter();
      this._sourceHinter = new SourceHinter();
      this.dragNodeCopy = null
      minder
        .getRenderContainer()
        .addShapes([this._dropHinter, this._sourceHinter]);

    },

    dragStart: function (position) {
      // 只记录开始位置，不马上开启拖放模式
      // 这个位置同时是拖放范围收缩时的焦点位置（中心）
      this._startPosition = position;
    },

    dragMove: function (position) {
      // 启动拖放模式需要最小的移动距离
      var DRAG_MOVE_THRESHOLD = 10;

      if (!this._startPosition) return;

      var movement = kity.Vector.fromPoints(
        this._dragPosition || this._startPosition,
        position
      );
      var minder = this._minder;

      this._dragPosition = position;

      if (!this._dragMode) {
        // 判断拖放模式是否该启动
        if (
          kity.Vector.fromPoints(
            this._dragPosition,
            this._startPosition
          ).length() < DRAG_MOVE_THRESHOLD
        ) {
          return;
        }
        if (!this._enterDragMode()) {
          return;
        }
      }
      const rootBox = this._minder._root.getLayoutBox()
      this._renderSourceHint(this._minder.getSelectedNodes().length, position.x, position.y, rootBox)
      this._dropTest()
    },

    dragEnd: function () {
      this._startPosition = null;
      this._dragPosition = null;

      if (!this._dragMode) {
        return;
      }


      if (this._dropSucceedTarget) {
        // 找到第一个top大于source的children
        
        this._minder.layout(-1);

        // _dropSucceedTarget 是目标节点
        let sourceIndex = 0
        const children = this._dropSucceedTarget.children || []
        let min = Number.MAX_VALUE, dragNum = 0
        
        const centerY = (this._sourceHinter.box.top + this._sourceHinter.box.bottom) / 2
        // 找到一个最近的
        for (let i = 0; i < children.length; i++) {
          if(children[i].isDrag) {
            dragNum++
            continue
          }
          const childBox = children[i].area
          const childCenterY = (childBox.top + childBox.bottom) / 2
          const num = Math.abs(childCenterY - centerY) 
          if(num < min) {
            min = num
            sourceIndex =i + (childCenterY - centerY > 0 ? 0 : 1) - dragNum
          }
        }
        this._minder.execCommand(
          "movetoparent",
          this._dragSources,
          this._dropSucceedTarget
        );
        // 判断在哪个子节点中间
        this._minder.execCommand("arrange", sourceIndex);

      } else {
        this._minder.fire("savescene");
      }
      this._fadeDragSources(1);
      this._minder.layout(300);
      this._leaveDragMode();
      this._minder.fire("contentchange");
      this._minder.execCommand("resetlayout");
    },

    // 进入拖放模式：
    //    1. 计算拖放源和允许的拖放目标
    //    2. 标记已启动
    _enterDragMode: function () {
      this._calcDragSources();
      if (!this._dragSources.length) {
        this._startPosition = null;
        return false;
      }
      this._fadeDragSources(0.5);
      this._calcDropTargets();
      this._dragMode = true;
      this._minder.setStatus("dragtree");
      return true;
    },

    // 从选中的节点计算拖放源
    //    并不是所有选中的节点都作为拖放源，如果选中节点中存在 A 和 B，
    //    并且 A 是 B 的祖先，则 B 不作为拖放源
    //
    //    计算过程：
    //       1. 将节点按照树高排序，排序后只可能是前面节点是后面节点的祖先
    //       2. 从后往前枚举排序的结果，如果发现枚举目标之前存在其祖先，
    //          则排除枚举目标作为拖放源，否则加入拖放源
    _calcDragSources: function () {
      this._dragSources = this._minder.getSelectedAncestors();
      this._selectedSource = this._minder.getSelectedNodes()
    },

    _fadeDragSources: function (opacity) {
      this._minder.getSelectedNodes().forEach(function (source) {
        source.getRenderContainer().setOpacity(opacity, 200);
        source.isDrag = opacity < 1

      });
      if(opacity < 1) {
        this.setAreaByNode(this._minder._root)
      }
    },
    setAreaByNode: function(node) {
      const children = node.children || []
      const nodeBox = node.getLayoutBox()
      let nodeArea = {}
      if(children.length > 0) {
        nodeArea  = {
          top: children[0].getLayoutBox().top - 16,
          left:nodeBox.right,
          right: nodeBox.right + 136,
          bottom: children[children.length - 1].getLayoutBox().bottom + 16,
          cx: nodeBox.cx,
          cy: nodeBox.cy,
        }
        children.forEach(i=> {
          this.setAreaByNode(i)
        })
      } else {
        nodeArea = {
          top: nodeBox.top,
          left:nodeBox.right,
          right: nodeBox.right + 136,
          bottom: nodeBox.bottom,
          cx: nodeBox.cx,
          cy: nodeBox.cy,
        }
      }
      nodeArea.center = {
        x: (nodeArea.left + nodeArea.right) /2 ,
        y: (nodeArea.top + nodeArea.bottom) /2 ,
      }
      node.area = nodeArea
    },

    // 计算拖放目标可以释放的节点列表（释放意味着成为其子树），存在这条限制规则：
    //    - 不能拖放到拖放目标的子树上（允许拖放到自身，因为多选的情况下可以把其它节点加入）
    //
    //    1. 加入当前节点（初始为根节点）到允许列表
    //    2. 对于当前节点的每一个子节点：
    //       (1) 如果是拖放目标的其中一个节点，忽略（整棵子树被剪枝）
    //       (2) 如果不是拖放目标之一，以当前子节点为当前节点，回到 1 计算
    //    3. 返回允许列表
    //
    _calcDropTargets: function () {
      function findAvailableParents(nodes, root) {
        var availables = [],
          i;
        availables.push(root);
        root.getChildren().forEach(function (test) {
          for (i = 0; i < nodes.length; i++) {
            if (nodes[i] == test) return;
          }
          availables = availables.concat(findAvailableParents(nodes, test));
        });
        return availables;
      }

      this._dropTargets = findAvailableParents(
        this._dragSources,
        this._minder.getRoot()
      );
      this._dropTargetBoxes = this._dropTargets.map(function (source) {
        return source.getLayoutBox();
      });
    },


    _leaveDragMode: function () {
      this._dragMode = false;
      this._dropSucceedTarget = null;
      this._orderSucceedHint = null;
      this._renderDropHint(null);
      this._renderSourceHint(0)
      this._minder.rollbackStatus();
    },

    _drawForDragMode: function () {
      this._text.setContent(this._dragSources.length + " items");
      this._text.setPosition(this._startPosition.x, this._startPosition.y + 5);
      this._minder.getRenderContainer().addShape(this);
    },

    /**
     * 通过 judge 函数判断 targetBox 和 sourceBox 的位置交叉关系
     * @param targets -- 目标节点
     * @param targetBoxMapper -- 目标节点与对应 Box 的映射关系
     * @param judge -- 判断函数
     * @returns {*}
     * @private
     */
    _boxTest: function (targets, targetBoxMapper, judge) {
      var sourceBoxes = this._dragSources.map(function (source) {
        return source.getLayoutBox();
      });

      var i, j, target, sourceBox, targetBox;

      judge =
        judge ||
        function (intersectBox, sourceBox, targetBox) {
          return intersectBox && !intersectBox.isEmpty();
        };
      let returnTarget = null, maxArea = 0
      const box = this._sourceHinter.box
      let minGap = Number.MAX_VALUE, minHeight = Number.MAX_VALUE
      for (i = 0; i < targets.length; i++) {
        target = targets[i];
        targetBox = target.area
        // 可以作为父节点,并且比较近
        var intersectBox = this.intersect(targetBox, box);
        const nodeBox = target.getLayoutBox()
        let gapWidth = targetBox.center.x - box.center.x, gapHeight = targetBox.center.y - box.center.y
        let gap = Math.sqrt(Math.pow( gapWidth,2) + Math.pow(gapHeight,2))
        if(intersectBox && (gap< minGap || (gap === minGap || gapHeight < minHeight))) {
          returnTarget = target
          minGap = gap
          minHeight = gapHeight
        }
      }
      return returnTarget;
    },

    intersect: function(box1, box2) {
      var left = Math.max(box1.left, box2.left), right = Math.min(box1.right, box2.right), top = Math.max(box1.top, box2.top), bottom = Math.min(box1.bottom, box2.bottom);
      if (left > right || top > bottom) return null;
      return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top
      };
  },
    _dropTest: function () {
      this._dropSucceedTarget = this._boxTest(
        this._dropTargets,
        function (target, i) {
          return this._dropTargetBoxes[i];
        },
        function (intersectBox, sourceBox, targetBox) {
          function area(box) {
            return box.width * box.height;
          }
          if (!intersectBox) return false;
          /*
           * Added by zhangbobell, 2015.9.8
           *
           * 增加了下面一行判断，修复了循环比较中 targetBox 为折叠节点时，intersetBox 面积为 0，
           * 而 targetBox 的 width 和 height 均为 0
           * 此时造成了满足以下的第二个条件而返回 true
           * */
          if (!area(intersectBox)) return false;
          // 面积判断，交叉面积大于其中的一半
          if (
            area(intersectBox) >
            0.5 * Math.min(area(sourceBox), area(targetBox))
          )
            return true;
          // 产生了交集,则合并
          if(intersectBox.width  && intersectBox.height) return true
          return false;
        }
      );
      this._renderDropHint(this._dropSucceedTarget);
      return !!this._dropSucceedTarget;
    },

    _renderDropHint: function (target) {
      this._dropHinter.render(target);
    },
    _renderSourceHint: function (number, x, y, rootBox) {
      this._sourceHinter.render(number, x, y, rootBox)
    },
    preventDragMove: function () {
      this._startPosition = null;
    },
  });

  Module.register("DragTree", function () {
    var dragger;

    return {
      init: function () {
        dragger = new TreeDragger(this);
        window.addEventListener("mouseup", function () {
          dragger.dragEnd();
        });
      },
      events: {
        "normal.mousedown inputready.mousedown": function (e) {
          // 单选中根节点也不触发拖拽
          if (e.originEvent.button) return;
          if (e.getTargetNode() && e.getTargetNode() != this.getRoot()) {
            dragger.dragStart(e.getPosition());
          }
        },
        "normal.mousemove dragtree.mousemove": function (e) {
          dragger.dragMove(e.getPosition());
        },
        "normal.mouseup dragtree.beforemouseup": function (e) {
          dragger.dragEnd();
          //e.stopPropagation();
          e.preventDefault();
        },
        statuschange: function (e) {
          if (e.lastStatus == "textedit" && e.currentStatus == "normal") {
            dragger.preventDragMove();
          }
        },
      },
      commands: {
        movetoparent: MoveToParentCommand,
      },
    };
  });
});
