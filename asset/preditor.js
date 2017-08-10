$.fn.preditor = function (opt) {
    opt = opt || {};
    opt['menu'] = opt['menu'] || [
        'undo', 'redo', 'pagesize', 'html', '|',//ext
        'fontsize', 'blod', 'italic', 'underline', 'strike', '|', 'textcolor', 'bgcolor', '|',//span
        'alignleft', 'aligncenter', 'alignright', 'alignjustify', '|',//line
        'brformat', 'indent', 'margintop', 'marginbottom', 'lineheight', '|',//line
        'link', 'img', 'div', '|',//append
    ];
    ///opt['editlog'] = opt['editlog'] || 400;
    opt['popup'] = opt['popup'] || true;
    opt['resizeable'] = opt['resizeable'] || true;
    opt['draggable'] = opt['draggable'] || true;
    opt['enterkey'] = opt['enterkey'] || true; //bug不能用
    this.each(function init() {
        if ($(this).is('+[editor]')) return;
        var $textarea = $(this);
        var $content = $('<div '
            //+ 'class="' + $textarea.attr('class') + '"'
            + ' style="' + $textarea.attr('style') + '"'
            + ' editor="none" '
            // + ' contenteditable= "false" '
            + ' >')
            .insertBefore($textarea);
        var $editor = $('<div class="editor" contenteditable=true>').appendTo($content);
        $textarea.hide();

        //bugfix 拖动行块级元素后两个相连的Text元素会直接合并 所以必须加br分割Text
        $editor.formatText = function (node) {
            node = node || this[0].firstChild;
            while (node) {
                if (node.nodeType == 3) {
                    //#text
                    if (node.textContent.trim()) {
                        //禁止直接选中editor
                        if (node.parentNode == this[0]) {
                            var $temp = $(node).wrap('<p>').parent();
                            node = $temp[0];

                            $temp = $temp.next();
                            if ($temp.is('br')) {
                                $temp.remove();
                            }
                            continue;
                        }
                        if (!node.nextSibling
                            || (node.nodeType != 3 && $(node.nextSibling).css('display') == 'block')) {
                            $(node).after(document.createElement('br'));
                        }
                    } else {
                        //not exists text  
                        if (node.parentNode == this[0]) {
                            setTimeout((function () {
                                $(this).remove();
                            }).bind(node));
                        }
                    }
                } else {
                    //#element 
                    $.each($(node).attr(), function (k, v) {
                        if (k != 'style' && k != 'src') $(node).removeAttr(k);
                    });
                    if (node.tagName == 'FIELDSET') {
                        var $child = $(node).children();
                        if ($child.length) {
                            $(node).parent().css($(node).css());
                            $(node).after($child).remove();
                            node = $child[0];
                        } else {
                            $child = $(node).next();
                            $(node).remove();
                            node = $child[0];
                        }
                    }
                    if (node.firstElementChild) {
                        //bugfix span 
                        if (node.parentNode == this[0] && $(node).css('display') != 'block') {
                            node = $(node).wrap('<p>').parent()[0];
                        }
                        $editor.formatText(node.firstElementChild);
                    } else {
                        if (node.innerHTML.trim()) {
                            var $parent = $(node).parent();
                            if ($(node).css('display') == 'inline' && $parent.css('display') == 'inline') {
                                //var styles = ($(node).attr('style') + ' ' + $parent.attr('style') )
                                //.match(/[\w-]+\s*:\s*[^;]+/g); //子优先级更高 
                                //双行内：拆掉外层行内 ，取内层样式 
                                $(node).css($.style2css($parent.attr('style') + '; ' + $(node).attr('style')));
                                $(node).unwrap();
                                continue;
                            }
                            if ($(node).css('display') == 'block') {
                                var css = {};
                                $.each(['font-style', 'font-weight', 'text-decoration'], function (k, v) {
                                    if ($(node).css(v)) {
                                        css[v] = $(node).css(v);
                                        $(node).css(v, '');
                                    }
                                });
                                $(node).wrapInner($('<span>').css(css));
                            }
                        } else {
                            if ($(node).is('p,span,br')) {
                                setTimeout((function () {
                                    $(this).remove();
                                }).bind(node));
                            } else {
                                //bugfix image
                                if (node.parentNode == this[0] && $(node).css('display') != 'block') {

                                    node = $(node).wrap('<p>').parent()[0];
                                }
                            }
                        }
                    }
                }
                node = node.nextSibling;
            }
        };

        //bugfix 某个加载内容单行出现多个双引号匹配错误
        $textarea.val = function () {
            return (this[0].value || '').replace(/(background[^;]+url\()['"]?([^'"]+)['"]?(\))/g, "$1$2$3");
        };
        //加载组件
        $content['opt'] = opt;
        $.fn.preditor['editlog'].call($content, [], $editor, $textarea);
        $.each(opt, function (key, val) {
            if ($.fn.preditor[key])
                $.fn.preditor[key].call($content, val, $editor, $textarea);
        });

        //初始化默认值
        $editor.html($textarea.val());
        $editor.formatText();

    });
}
$.fn.toggleCss = function (css, val) {
    var arr = this.attr('style');
    if (arr) {
        arr = arr.match(new RegExp(css + ':\s*([^;]+)'));
        if (arr && arr[1].trim() == val.trim()) {
            return this.css(css, '');
        }
    }
    return this.css(css, val);
}

//override
$.fn.removeAttr = new function () {
    var old = $.fn.removeAttr;
    return function (attr) {
        if (this[0] && this[0].removeAttribute) {
            return $(this).each(function () { this.removeAttribute(attr); });//IE bugfix 
        } else {
            return old.apply(this, arguments);
        }
    }
}
//override
$.fn.attr = new function () {
    var old = $.fn.attr;
    return function () {
        if (arguments.length === 0) {
            if (this.length === 0) {
                return null;
            }
            var obj = {};
            $.each(this[0].attributes, function () {
                if (this.specified) {
                    obj[this.name] = this.value;
                }
            });
            return obj;
        }
        return old.apply(this, arguments);
    };
};
//override
$.fn.css = new function () {
    var old = $.fn.css;
    return function () {
        if (arguments.length === 0) {
            return $.style2css(this.attr('style'));
        } else {
            return old.apply(this, arguments);
        }
    }
}
$.fn.menu = function T($self, arr, fn) {
    var $this = this;
    $this.on('focus', function (e) {
        if (T.$c) {
            return;
        }
        var rs = $self[0].getBoundingClientRect();
        var rt = e.target.getBoundingClientRect();
        console.log([rs, rt]);
        T.$c = $('<ul class="menulist">').appendTo($self);
        T.$c.css({ 'left': rt.left - rs.left, 'top': rt.top - rs.top });
        $.each(arr, function (k, v) {
            $('<li>' + v + '</li>').appendTo(T.$c).on('mousedown', fn);
        });
    });
    $this.on('blur', function () {
        T.$c.remove();
        T.$c = null;
    });
}

$.style2css = function (str) {
    var css = {};
    var styles = (str || '').match(/[\w-]+\s*:\s*[^;]+/g);
    $.each(styles || [], function (k, v) {
        var kv = v.split(':');
        if (css[kv[0]] == kv[1]) {
            css[kv[0]] = '';//delete
        } else {
            css[kv[0]] = kv[1];
        }
    });
    return css;
};

$.editlog = function CLASS(getter, setter) {
    if (this == jQuery) return new CLASS(getter, setter);

    var undo = [];
    var redo = [];
    var waiting = false;
    this.beginlog = function () {
        var before = getter();
        if (undo.length == 0) { // 空文档 && before) {
            undo.unshift(before);
            //console.log('init'); 
        }
        console.log('begin');
        waiting = true;
        return true;

    }
    this.cancellog = function () {
        waiting = false;
        console.log('cancel');
    };
    this.commitlog = function () {
        if (!waiting) {
            return;
        }
        var after = getter();
        if (undo[0] != after) {
            redo = [];
            undo.unshift(after);
            console.log("commit");
            return;
        }
    }
    this.undo = function () {
        if (undo.length <= 1) {
            return;
        }
        var val = undo.shift();
        redo.unshift(val);
        setter(undo[0]);
        console.log([undo, redo]);
    }
    this.redo = function () {
        if (redo.length <= 0) {
            return;
        }
        var val = redo.shift();
        undo.unshift(val);
        setter(val);
        console.log([undo, redo]);
    }
};

Range.pblock = function (elem) {
    //有可能出街 自行判断
    while (elem.nodeType == 3 || $(elem).css('display') != 'block') {
        elem = elem.parentNode;
    }
    return elem;
}
function Range(contenteditable) {
    this.toString = function () {
        return selection.toString();
    }
    this.getType = function () {
        if (!selection.focusNode) {
            return 'None';
        }
        if (selection.isCollapsed) {
            return "Caret";
        }
        ////// IE HACK //////
        if (selection.type == 'Range') {
            return "Range";
        }
        return "HACK";
        ////// IE HACK //////
    }
    this.parentBlock = function () {
        // if (selection.type == 'None') {
        //     return null;
        // }
        var node = range.commonAncestorContainer;
        while (1) {
            if (node == null) {
                return;
            }
            if (node.nodeType == 3) {
                node = node.parentNode;
                continue;
            }
            if ($(node).css('display') == 'inline') {
                node = node.parentNode;
                continue;
            }
            break;
        }
        return node;
    }
    this.allBlock = function () {
        // if (selection.isCollapsed) {
        //     return [];
        // }
        if (!contenteditable || !$(contenteditable).has(range.commonAncestorContainer).length) {
            if (range.commonAncestorContainer != contenteditable) {
                return [];//出界判断
            }
        }
        var curr = Range.pblock(range.startContainer);
        var done = Range.pblock(range.endContainer);
        return query(curr, done);

        function query(curr, done) {
            var arr = [];
            if (curr == contenteditable) {
                curr = contenteditable.firstChild;
            }
            if (done == contenteditable) {
                done = contenteditable.lastChild;
            }
            arr.push(curr);
            while (curr != null && curr != done) {
                if (arr[arr.length - 1] == done) {
                    break;
                }
                if (arr[arr.length - 1] == contenteditable) {
                    return []//出界判断
                }
                if (curr.nodeType == 1) {
                    if ($(curr).css('display') == 'block') {
                        if (curr.firstElementChild) {
                            curr = curr.firstElementChild;
                            continue;
                        }
                        arr.push(curr);
                    } else {
                        arr.push(curr.parentNode);
                    }
                }
                if (curr.nextSibling) {
                    curr = curr.nextSibling;
                    continue;
                }
                do {
                    curr = curr.parentNode;
                    if (!curr) {
                        break;
                    }
                } while (curr.nextSibling == null);
                if (!curr) {
                    break;
                }
                curr = curr.nextSibling;
            }
            arr.push(done);
            return $.unique(arr);
        }
    }
    this.selElement = function (node, start) {
        range.setStartBefore(node.firstChild || node);
        if (!start) {
            range.setEndAfter(node.lastChild || node);
        } else {
            range.setEndBefore(node);
        }
        this.applyRange();
    }
    this.clearRange = function () {
        if (!selection.isCollapsed) {
            document.execCommand('delete');
        }
        return this;
    }
    this.applyRange = function () {
        selection.removeAllRanges();//清除选择
        selection.addRange(range);
        //console.log([getSelection(),range]);
        // window.f = selection.focusNode;
        // setTimeout(function() {
        //     f.focus(); 
        //     console.log(f);
        // }, 500);
    }
    this.insertBr = function () {
        if (!$(contenteditable).has(range.commonAncestorContainer).length
            && contenteditable != range.commonAncestorContainer) {
            return;
        }
        this.clearRange();

        //bugfix
        if (range.commonAncestorContainer.nodeType == 3 && range.commonAncestorContainer.parentNode == contenteditable) {
            var sp = [range.startOffset, range.endOffset];
            var $s = $(range.commonAncestorContainer).wrap('<p>');
            range.setStart($s[0], sp[0]);
            range.setEnd($s[0], sp[1]);
        }


        var br = document.createElement('br');
        range.insertNode(br);
        //bugfix 最后一位元素且不可见时候光标不能选中 @$editor.formatText 
        if (!$(br).next().length && br.nextSibling && !br.nextSibling.textContent.trim()
            && $(br.parentNode).css('display') == 'block') {
            range.insertNode(br = document.createElement('br'));//chrome bug
        }

        // br.nextSibling.textContent = '|';
        // setTimeout(function(params) { 
        //     br.nextSibling.textContent = '';
        // },1000)
        range.setStartAfter(br);
        range.setEndAfter(br);
        this.applyRange();
    }
    this.insertParagraph = function () {
        if (!$(contenteditable).has(range.commonAncestorContainer).length
            && contenteditable != range.commonAncestorContainer) {
            return;
        }
        this.clearRange();

        var block = range.commonAncestorContainer;
        while (block.constructor.name == 'Text' || $(block).css('display') != 'block')
            block = block.parentNode;

        var ps = range.startOffset;
        //bugfix
        if (range.commonAncestorContainer == contenteditable) {
            var $p = $('<p><br/></p>');
            range.insertNode($p[0]);
            block = $p[0];
            ps = 0;
            range.setStart(block.firstChild, ps);
        }
        if (range.commonAncestorContainer.parentNode == contenteditable) {
            var $p = $("<p>").insertAfter(range.commonAncestorContainer);// P标签浏览器自动禁止嵌套 
            block = $p.append(range.commonAncestorContainer)[0];
            range.setStart(block.firstChild, ps);
        }
        //}
        range.setEndAfter(block);
        var ext = range.extractContents();
        var $before = $(block);
        var $before_first = $before;
        $before.after(ext);

        var $after = $before.next();
        var $after_first = $after;


        while ($before_first.children().length) {
            $before_first = $before_first.children().first();
            //if ($before.css('display') != 'block') break; 
        }
        while ($after_first.children().length) {
            $after_first = $after_first.children().first();
            //if ($after.css('display') != 'block') break; 
        }
        if (!$before_first.text().trim()) {
            $before_first.html("<br>");
        }

        while (1) {
            if ($after_first[0] == $after[0]) {
                if (!$after.text().trim()) {
                    $after.append("<br>");
                }
                break;
            }
            if (!$after_first.html() && $after_first[0].outerHTML.indexOf('</') != -1) {
                var a = $after_first.parent();
                $after_first.remove()
                $after_first = a;
                continue;
            }
            $after_first = $after_first.children().first();
            if ($after_first.is('br')) {
                $after_first.remove();
            }
            break;
        }




        //         //         // if (!$after.html()) { 
        //         //         //     if (!$(block).next().children().first().next().length) {
        //         //         //         $after.after("</br>"); 
        //         //         //     }
        //         //         //     $after.remove();
        //         //         // }


        //         //         // //双换号bug
        //         //         // if ($after[0].tagName == 'BR' ) {
        //         //         //     $after.remove();
        //         //         // }
        //         //         // if (!$after.text().trim()) { 
        //         //         //     if ($after.next().text().trim()) {
        //         //         //         $after.remove();//双spanbug
        //         //         //     } else {
        //         //         //         $after.html("<br>"); 
        //         //         //     }
        //         //         // }   

        //         //         // if (!$after[0].innerHTML && !$after[0].nextSibling) {
        // a        // a        //     $after.remove();
        //         //         // }

        var nnod = block.nextSibling;
        range.setStart(nnod, 0);
        range.setEnd(nnod, 0);
        this.applyRange();
    }
    this.wrapHTML = function (sel, defval) {
        if (selection.type == 'Caret' || selection.type == 'None') {
            if (defval) {
                range.setEnd(range.startContainer, range.startOffset);
                this.applyRange();
                document.execCommand('insertHTML', false, sel + defval);
                return false;
            }
            console.log(0);
            return false;
        }
        if (range.startContainer == range.endContainer
            && range.startContainer.length == range.endOffset
            && range.startOffset == 0) {
            var node = $(range.startContainer).wrap(sel)[0];  //sel 包裹 Element

            //未知 bugfix 
            setTimeout((function () {
                range.setStart(node, 0);
                range.setEndAfter(node);
                console.log(range);
                this.applyRange();
            }).bind(this), 100);

            console.log(1);
            return
        }

        // //bugfix 双击全选半包裹失败
        if (range.startContainer.parentNode == range.endContainer && range.startOffset == 0) {
            range.setStart(range.startContainer.parentNode, 0);
        }
        if (range.startContainer == range.endContainer) {
            var outer = $(sel)[0];
            range.surroundContents(outer);//sel 包裹 #text

            //未知 bugfix 
            setTimeout((function () {
                range.setStart(outer.firstChild, 0);
                range.setEndAfter(outer.lastChild);
                console.log(range);
                this.applyRange();
            }).bind(this), 100);

            console.log(2);
            return;
        }
        //直接包裹失败
        var $wrap = $(sel).html(selection.toString());
        document.execCommand('insertHTML', false, $wrap.prop('outerHTML'));
        console.log(3);
    }


    // this.elemRange = function(elem){
    //     range.setStartBefore(elem.firstChild||elem);
    //     range.setEndAfter(elem.lastChild||elem);
    // }
    // this.insertHTML = function(html){ 
    //     //range.setEndAfter(range.startContainer);
    //     document.execCommand('insertHTML',false,html);
    // } 

    if (this.constructor != Range) {
        return new Range(contenteditable);
    }
    var selection = document.getSelection();
    if (this.getType() == 'None') {
        var range = document.createRange();
    } else {
        var range = selection.getRangeAt(0);
    }
    return this;
};

//////////////// 重写撤销重做  ////////////////
$.fn.preditor['editlog'] = function (val, $editor, $textarea) {
    var log = $.editlog(function () {
        return $textarea[0].value = $editor.html();
    }, function (notify) {
        $editor.html($textarea[0].value = notify);
    });
    var commitTimer = null;
    $editor.on('keydown', function (e) {
        switch (true) {
            case e.key == 'z' && e.ctrlKey:
                commitTimer ? log.commitlog() : log.cancellog();
                log.undo();
                return false;
            case e.key == 'y' && e.ctrlKey:
                commitTimer ? log.commitlog() : log.cancellog();
                log.redo();
                return false;
            case e.keyCode == 229://输入法输入
                //ime event -> compositionupdate/compositionend
                return false;
            case e.keyCode == 46 || e.keyCode == 8: //删除/退格键  
                $editor.trigger('keypress');
            default:
                break;
        }
        log.beginlog();
    });
    $editor.on('keypress', function () {
        if (commitTimer == null) {
            commitTimer = true;//开始计时
        }
    })
    $editor.on('keyup', function () {
        if (commitTimer == null) {
            return;
        }
        clearTimeout(commitTimer);
        commitTimer = setTimeout(function () {
            commitTimer = null;
            log.commitlog();
        }, 500);
    });
    $editor.on('paste cut', function (e) {
        commitTimer = setTimeout(function () {
            $editor.formatText();
            log.commitlog();
        });
    });
    $editor.on('compositionupdate', function () {
        log.beginlog();
        //console.log('1');
    });
    $editor.on('compositionend', function () {
        log.commitlog();
        //console.log('2');
    });

    $editor.log = log;
    this.log = log;
}

//////////////// 重写插入回车规则 ///////////////
$.fn.preditor['enterkey'] = function (val, $editor) {
    $editor.on('keypress', function (e) {
        if (e.keyCode == 13 && e.shiftKey) {
            Range($editor[0]).insertBr();
            return false;
        }
        if (e.keyCode == 13) {
            Range($editor[0]).insertParagraph();
            return false;
        }
    });
}

//////////////// 重写拖动规则 /////////////// 
$.fn.preditor['draggable'] = function (val, $editor, $menu, $foot) {
    var $content = this; 
    $editor.on('mousedown', function (e) {
        setTimeout(function () {
            if ($('[draggable]').length && !$editor.$dragElem) { 
                $content.delDragCtrl(); 
                $('<input>').prependTo($content).focus().remove();//IE HACK
            }
        }, 300);
    })
    // $editor.on('dragstart', 'img', function (e) { 
    //     return false;//无法实现 禁止拖动图片
    // });
    $editor.on('dragstart', '[draggable=true]', function (e) {
        $editor.addClass('draging');
        if (this == e.target) {
            if (Range($editor[0]).getType() != 'Range') {
                $editor.$dragElem = $(this);
            }
        }
    });
    //拖动（默认只有块级元素会触发
    $editor.on('dragstart', function (e) {
        if (!$editor.log.beginlog()) {
            alert();
            return false;
        }
    });
    $editor.on('dragend', function () {
        $editor.removeClass('draging');
        $editor.formatText();
        $editor.log.commitlog();
        if ($editor.$dragElem) {
            delete $editor.$dragElem;
            console.log(2222222222222222222222222222222222222);
            $('<input>').prependTo($content).focus().remove();//IE HACK 
            return true;
        }
    });
    $editor.on('dragover', ':not([draggable=true])', function T(e) {
        e = e.originalEvent;
        if (!$editor.$dragElem) {
            return true;
        }
        // if(T.lock){
        //     return false;
        // }
        // T.lock = true;
        // setTimeout(function () {
        //     T.lock = false;
        // }, 200); 
        if (T.locky == e.clientY) {
            return false;
        }
        T.locky = e.clientY;


        var target = Range.pblock(e.target);
        if ($(target).closest('[draggable]').length) {
            return false;
        }
        if (!target.innerHTML.trim()) {
            $editor.$dragElem.appendTo(target);
            console.log('appendTo');
            return false;
        }
        var top = 0.4;
        var bottom = 0.6;
        if ($editor.$dragElem.parent()[0] == target) {
            top = 0.1;
            bottom = 0.9;
        }
        if (target.offsetHeight * top > e.offsetY) {//避免嵌套
            //if (target.offsetHeight *0.01 > e.offsetY) {
            $editor.$dragElem.insertBefore(target);
            console.log('insertBefore ' + target.offsetHeight + ' ' + top + ' ' + (target.offsetHeight * top) + ' ' + e.offsetY);
            return false;
        }
        if (target.offsetHeight * bottom < e.offsetY) {//避免嵌套
            //if (target.offsetHeight * 0.99 < e.offsetY) {
            $editor.$dragElem.insertAfter(target);
            console.log('insertAfter ' + target.offsetHeight + ' ' + bottom + ' ' + (target.offsetHeight * bottom) + ' ' + e.offsetY);
            return false;
        }
        console.log('insertAfter ' + target.offsetHeight + ' ' + (target.offsetHeight * top) + ' ' + (target.offsetHeight * bottom) + ' ' + e.offsetY);
        // if ($editor.$dragElem[0].parentNode != e.target) {
        //     $editor.$dragElem.appendTo(e.target);
        //     console.log('appendTo3');
        //     return true;
        // }
        return false;
    })
}

$.fn.preditor['resizeable'] = function (val, $editor) {
    // $editor.on('click', function () {

    // });
}


$.fn.preditor['popup'] = function (val) {
    var $content = this;
    var $popup = $('<div class="popup">').appendTo(this).on('mouseover', function () {
        $(this).css('opacity', '');
    });
    var $foot = $('<div class="foot">').appendTo($popup).on('mousedown', function (e) {
        if (this == e.target) {
            return false;
        }
        var focusElem = e.target.elem;
        if ($(focusElem).css('display') == 'inline') {
            return false;
        }
        if (!focusElem) {
            return true;
        }
        $content.delDragCtrl();
        $content.addDragCtrl(focusElem);
        showMenu(focusElem);
        return false;
    });
    var $editor = this.find('.editor').on('keydown', function () {
        $popup.hide();
    });
    $editor.on('scroll', function () {
        $popup.hide();
    });
    $editor.on('mousedown', function (e) {
        $popup.hide();
    })
    $content.delDragCtrl = function () {
        $editor.find('[draggable]').removeAttr('draggable').removeAttr('contenteditable');
    }
    $content.addDragCtrl = function (elem) {
        $(elem).attr('draggable', 'true').attr('contenteditable', 'false');
    }
    $editor.on('click', '*', function T(e) {
        if (e.target != this) {
            return; //冒泡跳过
        }
        $foot.empty();
        var $curr = $(e.target);
        var i = -1;
        while (1) {
            if (i++ > 50) {
                break;
            }
            if ($curr.css('display') != 'inline' || !i) {
                if (i) {
                    $foot.prepend(" > ");
                }
                var $elem = $("<span>" + $curr[0].tagName + "</span>").prependTo($foot);
                $elem[0].elem = $curr[0];
            }
            if ($curr.parent().is('[contenteditable],body')) {
                break;
            }
            $curr = $curr.parent();
        }
        showMenu(e.target);

        var cp = $content[0].getBoundingClientRect(); //主窗体
        $popup.css({ 'max-width': cp.width - 30 })
        var ep = e.target.getBoundingClientRect();//选中元素
        $popup.css({
            opacity: 0.3,
            top: Math.min(ep.top - cp.top + ep.height, cp.height - $popup.height() - 30) + 'px',
            //right:0,
            left: Math.min(ep.left - cp.left, cp.width - $popup.width() - 30).toFixed(0) + 'px',

        })
    });
    function showMenu(elem) {
        $popup.show();
        $foot.nextAll().remove();
        var tag = elem.tagName.toLocaleLowerCase();
        if ($.fn.preditor['popup-' + tag]) {
            $.fn.preditor['popup-' + tag].call($content, elem, $popup);
        } else {
            $.fn.preditor['popup-'].call($content, elem, $popup);
        }
    }
}
$.fn.preditor['popup-a'] = function (self, $popup) {
    var log = this.log;
    $popup.find('.foot').append(" <a target=new class='title' href='" + $(self).attr('href') + "'>" + $(self).attr('href') + "</a><br>");
    $('<a href="javascript:void(0)">修改</a>').appendTo($popup).click(function () {
        log.beginlog();
        var href = prompt('超链接地址：', $(self).attr('href'));
        if (href) {
            self.href = href;
            $popup.find('.title').html(href).attr('href', href);
            log.commitlog();
        } else {
            log.cancellog();
        }
    });
    $('<a href="javascript:void(0)">清除</a>').appendTo($popup).click(function () {
        $(self).after($(self).html()).remove();
    });

}
$.fn.preditor['popup-img'] = function (self, $popup) {
    var log = this.log;
    var reg = this.opt.upload_name || '';
    var url = this.opt.upload_url || '';
    var data = this.opt.upload_params || {};
    $popup.find('.foot').append(" <a target=new class='title' href='" + $(self).attr('src') + "'>" + $(self).attr('src') + "</a><br>");
    $('<a href="javascript:void(0)">上传图片</a>').appendTo($popup).click(function () {
        $('<input type="file" >').change(function () {
            if (!this.files || !this.files[0]) return;
            var formData = new FormData();
            formData.append(reg, this.files[0]);
            $.each(data, function (k, v) {
                formData.append(k, v);
            });
            $.ajax({
                url: url, type: 'POST', cache: false,
                data: formData, processData: false, contentType: false
            }).then(function (json) {
                var src = json.data[0];
                if (!json.data || !json.data[0]) {
                    return;
                }
                log.beginlog();
                self.src = src;
                log.commitlog();
            });
        }).click()

    });
    $('<a href="javascript:void(0)">修改路径</a>').appendTo($popup).click(function () {
        var src = prompt('图片地址：', $(self).attr('src'));
        if (src) {
            log.beginlog();
            self.src = src;
            log.commitlog();
            $popup.find('.title').html(src).attr('href', src);
        }
    });
    $('<a href="javascript:void(0)">自适应宽度</a>').appendTo($popup).click(function () {
        log.beginlog();
        $(self).css({ 'height': '', 'width': '100%' });
        log.commitlog();
    });
    $('<a href="javascript:void(0)">调整宽度</a>').appendTo($popup).click(function () {
        log.beginlog();
        var width = prompt('图片地址：', $(self).css('width'));
        if (width) {
            $(self).css({ 'height': '', 'width': width });
            log.commitlog();
        } else {
            log.cancellog();
        }
    });
    // $('<a href="javascript:void(0)">左浮动</a>').appendTo($popup).click(function(){
    //     log.beginlog(); 
    //     $(self).toggleCss('float', 'left');
    //     log.commitlog();   
    // }); 
    // $('<a href="javascript:void(0)">右浮动</a>').appendTo($popup).click(function(){
    //     log.beginlog(); 
    //     $(self).toggleCss('float', 'right');
    //     log.commitlog();   
    // });
}
// $.fn.preditor['popup-fieldset'] = function (self, $popup) {
//     var log = this.log;
//     $('<a href="javascript:void(0)">行剧中</a>').appendTo($popup).click(function () {
//         log.beginlog();
//         $(self).css('margin', 'auto');
//         log.commitlog(); 
//     }); 
// }
// $.fn.preditor['menu-autowidth'] = function (val, $editor) {
//     var arr = ['auto', '5px', '10px', '20px', '30px','40px','50px','60px','70px','80px',];
//     var $btn = this.addMenuList('行边距', 'iconfont icon-autowidth', arr, function (value) {
//         $(Range($editor[0]).allBlock()).css('margin-left', this.innerHTML).css('margin-right', this.innerHTML);
//     });
// }
$.fn.preditor['popup-span'] = function (self, $popup) {

}
$.fn.preditor['popup-'] = function (self, $popup) {
    var log = this.log;
    var $editor = $(this).find('.editor');
    $('<a href="javascript:void(0)">上插入新行</a>').appendTo($popup).click(function () {
        log.beginlog();
        var range = Range($editor[0]);
        var $block = $(self);
        var $new = $block.clone().html("<br>").insertBefore($block);
        range.selElement($new[0]);
        log.commitlog();
        setTimeout(function () {
            $popup.hide();
        });
    });
    $('<a href="javascript:void(0)">下插入新行</a>').appendTo($popup).click(function () {
        log.beginlog();
        var range = Range($editor[0]);
        var $block = $(self);
        var $new = $block.clone().html("<br>").insertAfter($block);
        range.selElement($new[0]);
        log.commitlog();
        setTimeout(function () {
            $popup.hide();
        });
    });
    var arr = ['auto', '5px', '10px', '20px', '30px', '40px', '50px', '60px', '70px', '80px',];
    $('<a href="javascript:void(0)">行边距</a>').appendTo($popup).menu(this, arr, function () {
        log.beginlog();
        $(self).css('margin-left', this.innerHTML).css('margin-right', this.innerHTML);
        log.commitlog();
        setTimeout(function () {
            $popup.hide();
        });
    });
    $('<a href="javascript:void(0)">调整宽度</a>').appendTo($popup).click(function () {
        var width = prompt('宽度：', $(self).css('width'));
        if (width) {
            log.beginlog();
            $(self).css('width', width);
            log.commitlog();
        }
    });

    $('<a href="javascript:void(0)">删除</a>').appendTo($popup).click(function () {
        log.beginlog();
        $(self).after($(self).children()).remove();//.attr('style', '');
        log.commitlog();
        setTimeout(function () {
            $popup.hide();
        });
    });
}

$.fn.preditor['menu'] = function (val, $editor, $textarea) {
    var $content = this;
    var $menu = $('<div class="menu">').prependTo(this);

    //
    function loghandle(fn) {
        return function (e) {
            $editor.log.beginlog();
            fn.call(this, e);
            $editor.formatText();
            $editor.log.commitlog();
        }
    }
    this.addMenuButton = function (name, icon, fn, notlog) {
        return $('<button title="' + name + '" type="button" class="' + icon + '"></button>').appendTo($menu).click(notlog ? fn : loghandle(fn));
    };
    this.addMenuList = function T(name, icon, arr, fn) {
        return $('<button title="' + name + '"  type="button" class="' + icon + '"></button>').appendTo($menu).menu(this, arr, loghandle(fn));
    }
    this.addMenuItem = function ($elem) {
        $menu.append($elem);
    }
    $.each(val, function (key, val) {
        $.fn.preditor['menu-' + val].call($content, null, $editor, $textarea);
    });
}
$.fn.preditor['menu-redo'] = function (val, $editor) {
    this.addMenuButton('撤销', 'iconfont icon-redo', function () {
        $editor.log.redo();
    });
};
$.fn.preditor['menu-undo'] = function (val, $editor) {
    this.addMenuButton('重做', 'iconfont icon-undo', function () {
        $editor.log.undo();
    });
};
$.fn.preditor['menu-|'] = function (val, $editor) {
    this.addMenuItem('<span>|</span>');
};
$.fn.preditor['menu-textcolor'] = function (val, $editor) {
    var $c = $('<input type="color" style="position:absolute;top:-9999999px">');
    var log = this.log;
    $c.insertBefore($editor).on('change', function (params) {
        Range($editor[0]).wrapHTML('<span style="color:' + this.value + ';">');
        log.commitlog();
    })
    var $b = this.addMenuButton('字体颜色', 'iconfont icon-color"', function (e) {
        $c.click();
        log.beginlog();
    }, true);
}
$.fn.preditor['menu-bgcolor'] = function (val, $editor) {
    var $c = $('<input type="color" style="position:absolute;top:-9999999px">');
    var log = this.log;
    $c.insertBefore($editor).on('change', function (params) {
        Range($editor[0]).wrapHTML('<span style="background:' + this.value + ';">');
        log.commitlog();
    })
    var $b = this.addMenuButton('背景颜色', 'iconfont icon-bgcolor', function (e, next) {
        $c.click();
        log.beginlog();
    }, true);
}
$.fn.preditor['menu-blod'] = function (val, $editor) {
    this.addMenuButton('粗体', 'iconfont icon-font-blod', function () {
        Range($editor[0]).wrapHTML('<span style="font-weight: bold;">');
    });
}
$.fn.preditor['menu-italic'] = function (val, $editor) {
    this.addMenuButton('斜体', 'iconfont icon-font-italic', function () {
        Range($editor[0]).wrapHTML('<span style="font-style: italic;">');
    });
}
$.fn.preditor['menu-underline'] = function (val, $editor) {
    this.addMenuButton('下划线', 'iconfont icon-font-underline', function () {
        Range($editor[0]).wrapHTML('<span style="text-decoration: underline;">');
    });
}
$.fn.preditor['menu-strike'] = function (val, $editor) {
    this.addMenuButton('删除线', 'iconfont icon-font-strike', function () {
        Range($editor[0]).wrapHTML('<span style="text-decoration: line-through;">');
    });

}
$.fn.preditor['menu-alignleft'] = function (val, $editor) {
    this.addMenuButton('左对齐', 'iconfont icon-align-left', function () {
        $(Range($editor[0]).allBlock()).toggleCss('text-align', 'left');
    });
}
$.fn.preditor['menu-aligncenter'] = function (val, $editor) {
    this.addMenuButton('居中对齐', 'iconfont icon-align-center', function () {
        $(Range($editor[0]).allBlock()).toggleCss('text-align', 'center');
    });
}
$.fn.preditor['menu-alignright'] = function (val, $editor) {
    this.addMenuButton('右对齐', 'iconfont icon-align-right', function () {
        $(Range($editor[0]).allBlock()).toggleCss('text-align', 'right');
    });
}
$.fn.preditor['menu-alignjustify'] = function (val, $editor) {
    this.addMenuButton('两端对齐', 'iconfont icon-align-justify', function () {
        $(Range($editor[0]).allBlock()).toggleCss('text-align', 'justify');
    });
}


$.fn.preditor['menu-indent'] = function (val, $editor) {
    this.addMenuButton('首行缩进', 'iconfont icon-indent', function () {
        $(Range($editor[0]).allBlock()).toggleCss('text-indent', '2em');
    });
}
$.fn.preditor['menu-margintop'] = function (val, $editor) {
    var arr = ['0px', '5px', '10px', '15px', '20px', '25px', '30px', '50px', '100px'];
    var $btn = this.addMenuList('段前距', 'iconfont icon-spacing-top', arr, function (value) {
        $(Range($editor[0]).allBlock()).css('margin-top', this.innerHTML);
    });
}
$.fn.preditor['menu-marginbottom'] = function (val, $editor) {
    var arr = ['0px', '5px', '10px', '15px', '20px', '25px', '30px', '50px', '100px'];
    var $btn = this.addMenuList('段后距', 'iconfont icon-spacing-bottom', arr, function (value) {
        $(Range($editor[0]).allBlock()).css('margin-bottom', this.innerHTML);
    });
}
$.fn.preditor['menu-fontsize'] = function (val, $editor) {
    var arr = ['12px', '14px', '16px', '18px', '20px', '22px', '24px', '26px', '28px', '36px', '48px', '72px'];
    var $sel = this.addMenuList('字体大小', 'iconfont icon-font-size', arr, function (value) {
        Range($editor[0]).wrapHTML('<span style="font-size:' + this.innerHTML + ';">');
    });
}
$.fn.preditor['menu-lineheight'] = function (val, $editor) {
    var arr = ['normal', '1.5', '1.75', '2', '3', '4', '5']
    var $btn = this.addMenuList('行间距', 'iconfont icon-line-spacing', arr, function (value) {
        $(Range($editor[0]).allBlock()).css('line-height', this.innerHTML);
    });
}

$.fn.preditor['menu-brformat'] = function (val, $editor) {
    this.addMenuButton('格式化', 'iconfont icon-brush', function () { 
        var $a = $(Range($editor[0]).allBlock());
        $a.each(function (i, elem) {
            if ($(elem).css('display') == 'block' && elem.nodeName!='P') {
                $(elem).replaceWith("<p>"+$(elem).html()+'</p>');
            }

        });
        var $brp = $a.find("br").parent(); 
        $brp.each(function (elem) {
            var arr = this.innerHTML.split(/<br[^>]*>/g);
            for (var i = arr.length - 1; i >= 0; i--) {
                if (arr[i]) $(this).after("<p>" + arr[i] + "</p>");
            }
        });
        $brp.remove(); 
    });
}
$.fn.preditor['menu-pagesize'] = function (val, $editor) {
    var arr = ['auto', '340px', '480px', '768px']
    var $btn = this.addMenuList('页面大小', 'iconfont icon-phone', arr, function (value) {
        $editor.css({ 'width': this.innerHTML });
    }, true);
}
$.fn.preditor['menu-html'] = function (val, $editor, $textarea) {
    var $content = this;
    var log = this.log;
    this.addMenuButton('源代码', 'iconfont icon-html', function (value, next) {
        $textarea.toggleCss('display', 'none');
        if ($textarea.prev()[0] == $content[0]) {
            $textarea.appendTo($content).css({ 'display': '', });
            $editor.css('display', 'none');
            log.beginlog();
        } else {
            $textarea.insertAfter($content).css({ 'display': 'none', });
            $editor.css('display', '').html($textarea.val());
            $editor.formatText();
            log.commitlog();
        }
    }, true);
}


$.fn.preditor['menu-link'] = function (val, $editor) {
    this.addMenuButton('超链接', 'iconfont icon-link', function () {
        Range($editor[0]).wrapHTML('<a href="#" >', '链接文本');
    });
}
$.fn.preditor['menu-img'] = function (val, $editor) {
    this.addMenuButton('图片', 'iconfont icon-pic', function () {
        document.execCommand("insertHTML", false, '<img src="/" style="width:120px;height:120px" />');
    })
}
$.fn.preditor['menu-div'] = function (val, $editor) {
    // this.addMenuButton('图片', 'iconfont icon-pic', function () {
    //     document.execCommand("insertHTML", false, '<div contenteditable="false" style="resize:both;user-select:none;overflow:auto; display:inline-block;width:120px;height:120px;border:1px solid #ccc"  ></div>');
    // })
}
