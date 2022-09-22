/**
 * Exit Intent Widget
 * @author Conner Charlebois (Mendix)
 * --- @since Jul 3, 2018 @version 1.0.2 ---
 * Upgrade to work with Mx 7.15
 * - change name of advisor target from mx.router.openFormInContent to mx.ui.openPage
 * - return a promise from advisor function
 * - add a handle to the close page button
 * --- /@since ---
 */
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dojo/aspect",

    // "mxui/dom",
    // "dojo/dom",
    // "dojo/dom-prop",
    // "dojo/dom-geometry",
    // "dojo/dom-class",
    // "dojo/dom-style",
    // "dojo/dom-construct",
    // "dojo/_base/array",
    "dojo/_base/lang",
    // "dojo/text",
    // "dojo/html",
    // "dojo/_base/event",
    "ExitIntent/widget/lib/ConfirmationDialog2",
], function (
    declare,
    _WidgetBase,
    aspect,
    // dom,
    // dojoDom,
    // dojoProp,
    // dojoGeometry,
    // dojoClass,
    // dojoStyle,
    // dojoConstruct,
    // dojoArray,
    dojoLang,
    // dojoText,
    // dojoHtml,
    // dojoEvent
    confirmationDialog2
) {
    "use strict";

    return declare("ExitIntent.widget.ExitIntent", [_WidgetBase], {
        // from modeler
        changesMf: "",
        yesMf: "",
        noMf: "",
        promptText: "",
        yesText: "",
        noText: "",
        modalText: "",

        // Internal variables.
        _handles: null,
        _contextObj: null,
        _pageForm: null,

        postCreate: function () {
            // console.log(this)
            logger.debug(this.id + ".postCreate");

            if (window.mx.ui.openPage) {
                this.handle = aspect.around(
                    window.mx.ui,
                    "openPage",
                    dojoLang.hitch(this, this._aroundFunc)
                );
            } else if (window.mx.ui.openForm2) {
                this.handle = aspect.around(
                    window.mx.ui,
                    "openForm2",
                    dojoLang.hitch(this, this._aroundFunc)
                );
            } else {
                console.error(
                    "Could not find the mx api function that opens a page (openPage or openForm2"
                );
            }
            this.handle2 = aspect.around(
                window.mx.ui.getContentForm(),
                "close",
                dojoLang.hitch(this, this._aroundFunc)
            );
            this._pageForm = this.mxform;
        },

        _aroundFunc: function (origOpenFormInContent) {
            // console.log('hi');
            var self = this;
            var confirm2 = function (args) {
                new confirmationDialog2({
                    caption: args.caption,
                    content: args.content,
                    yes:
                        args.yes ||
                        this.translate("mxui.widget.DialogMessage", "ok"),
                    no: args.no,
                    yesHandler: args.yesHandler,
                    noHandler: args.noHandler,
                }).show();
            };

            return function () {
                var origNav = origOpenFormInContent;
                var args = arguments;
                var theWidget = self;
                var theRouter = this;

                // only intercept if we're opening a new page in content
                if (
                    args[4] &&
                    args[4].location &&
                    args[4].location !== "content"
                ) {
                    // do the normal thing
                    origNav.apply(theRouter, args);
                    return Promise.resolve();
                }

                mx.data.action({
                    params: {
                        actionname: theWidget.changesMf,
                        applyto: "selection",
                        guids: [theWidget._contextObj.getGuid()],
                    },
                    callback: function (guidsChanged) {
                        console.log(guidsChanged);
                        if (guidsChanged) {
                            confirm2({
                                caption: theWidget.modalText,
                                content: theWidget.promptText,
                                yes: theWidget.yesText,
                                no: theWidget.noText,
                                yesHandler: function () {
                                    // origNav.apply(theRouter, args);
                                    theWidget._runMicroflow(
                                        self.yesMf,
                                        self._contextObj,
                                        origNav,
                                        theRouter,
                                        args
                                    );
                                    // theWidget._commitChanges(objectsChanged)
                                },
                                noHandler: function () {
                                    // console.log("cancel handler");
                                    // origNav.apply(theRouter, args);
                                    if (self.noMf) {
                                        theWidget._runMicroflow(
                                            self.noMf,
                                            self._contextObj,
                                            origNav,
                                            theRouter,
                                            args
                                        );
                                    }
                                },
                            });
                        } else {
                            origNav.apply(theRouter, args);
                        }
                    },
                    error: function (err) {
                        console.log(err);
                    },
                });

                return Promise.resolve();
            };
        },

        update: function (obj, cb) {
            if (obj) {
                this._contextObj = obj;
            }
            cb();
        },

        uninitialize: function () {
            this.handle.remove();
            this.handle2.remove();
        },

        // striaght commit --
        // ------------------
        // use this if you want the widget to commit
        // ------------------
        // _commitChanges: function(objects){
        //   mx.data.commit({
        //     mxobjs: objects,
        //     callback: function() {
        //       console.log('success')
        //     },
        //     error: function(err) {
        //       console.log(err)
        //     }
        //   })
        // },

        _runMicroflow: function (mf, obj, cb, scope, args) {
            if (!obj) return;
            // console.log('saving ' + obj.getGuid())
            mx.data.action({
                params: {
                    actionname: mf,
                    applyto: "selection",
                    guids: [obj.getGuid()],
                },
                origin: this._pageForm,
                callback: function (res) {
                    // should the navigation occur?
                    // @since Apr 17, 2018
                    if (res) {
                        cb.apply(scope, args);
                    } else {
                        console.debug(
                            "We're cancelling the navigation because the handler function returned false."
                        );
                    }
                },
                error: function (err) {
                    console.log("err");
                },
            });
        },

        _isEmptyObject: function (obj) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) return false;
            }
            return JSON.stringify(obj) === JSON.stringify({});
        },
    });
});

require(["ExitIntent/widget/ExitIntent"]);
