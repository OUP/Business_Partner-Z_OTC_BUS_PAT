sap.ui.define([], function () {
  "use strict";

  const _sDeferredGroupId = new Date().getTime();
  let _oCreateContext;
  let _oDataModel;

  return {
    onInit: function () {
      // test
      this._oComponent = this.getOwnerComponent();
      this._oResourceBundle = this._oComponent
        .getModel("i18n")
        .getResourceBundle();
      this._olView = this.getView();

      // set deffered batch group
      _oDataModel = this._oComponent.getModel();

      // default group id
      _oDataModel.setDeferredGroups(
        _oDataModel.getDeferredGroups().concat([_sDeferredGroupId])
      );
    },

    onAfterRendering: function () {
      var createIconId = this._olView.getId() + "--addEntry";
      if (sap.ui.getCore().byId(createIconId) !== undefined) {
        sap.ui.getCore().byId(createIconId).setVisible(false);
      }
    },

    onCreate: function (oEvent) {
      if (!this._oPopover) {
        this._oPopover = sap.ui.xmlfragment(
          this._olView.getId(),
          "oup.otc.business.partner.ext.fragment.CreatePopOver",
          this
        );
        this.getView().addDependent(this._oPopover);
      }
      var pop = oEvent.getSource();
      this._oPopover.openBy(pop);
    },

    onCreateCommon: function (oEvt) {
      // Temporary solution to clear stateful messages
      sap.ui.getCore().getMessageManager().removeAllMessages();

      this.getView().setBusy(true);
      var oButton = oEvt.getSource().getId();
      oButton = oButton.slice(oButton.lastIndexOf("--") + 2, oButton.length);
      var oApi = this.extensionAPI;
      var urlParameters = {};
      var sBusinessPartnerCategory;

      if (oButton === "CreatePerson") {
        urlParameters = {
          BusinessPartner: "",
          BusinessPartnerCategory: "1",
        };
        sBusinessPartnerCategory = "1";
      } else if (oButton === "CreateOrganization") {
        urlParameters = {
          BusinessPartner: "",
          BusinessPartnerCategory: "2",
        };
        sBusinessPartnerCategory = "2";
      }

      var oPromise = oApi.invokeActions(
        "/ZOTC_C_BP_CUSTOMERCreate",
        [],
        urlParameters
      );

      const success = (aResponse) => {
        if (aResponse[0] && aResponse[0].response) {
          var oResponseContext = aResponse[0].response.context;
          if (oResponseContext) {
            this._createDialog("", oResponseContext, sBusinessPartnerCategory);
          }
        }
      };

      const error = () => this._olView.setBusy(false);

      oPromise.then(success, error);
    },

    _createDialog: function (oResponse, oContext, sBusinessPartnerCategory) {
      var oNavController = this.extensionAPI.getNavigationController();
      var sDialogTitle;

      if (sBusinessPartnerCategory === "1") {
        sDialogTitle = this._oResourceBundle.getText(
          "@createpersonDialogTitle"
        );
      } else {
        sDialogTitle = this._oResourceBundle.getText(
          "@createorganizationDialogTitle"
        );
      }

      if (!this.createPersonDialog) {
        this.createPersonDialog = new sap.m.Dialog({
          contentWidth: "60%",
          contentHeight: "52%",
          draggable: true,
          resizable: true,
          title: sDialogTitle,
          content: this._oFragment(sBusinessPartnerCategory),
          afterClose: () => {
            this._olView.removeDependent(this.createPersonDialog);
            this.createPersonDialog.destroy();
            this.createPersonDialog = null;
          },
          buttons: [
            {
              text: this._oResourceBundle.getText("@ok"),
              type: "Emphasized",
              press: () => {
                this.createPersonDialog.close();
                sap.m.MessageToast.show(
                  this._oResourceBundle.getText("@navigationMsg")
                );

                _oDataModel.callFunction(
                  "/ZOTC_C_BP_CUSTOMERPopulate_field_value",
                  {
                    method: "POST",
                    urlParameters: {
                      Key: oContext.getObject().DraftUUID,
                    },
                    success: () => {
                      oNavController.navigateInternal(oContext);
                    },
                    error: (oError) => {
                      MessageToast.show(`Error in navigation - ${oError}`);
                    },
                  }
                );

                // oNavController.navigateInternal(oContext);
              },
            },
            {
              text: this._oResourceBundle.getText("@cancel"),
              press: () => {
                this.createPersonDialog.setBusy(true);
                this._isChangesPending(oContext, this, this._discardDraft);
              },
            },
          ],
        });
      }
      this.createPersonDialog.setModel(this._olView.getModel());
      this.createPersonDialog.setModel(
        this._oComponent.getModel("i18n"),
        "i18n"
      );
      this.createPersonDialog.setBindingContext(oContext);

      this._olView.addDependent(this.createPersonDialog);
      this._olView.setBusy(false);
      this.createPersonDialog.open();

      //   var salesOrg = this.getView().byId("header::SalesOrg");

      //   this.createPersonDialog.bindElement({
      //     path: oContext.getPath(),
      //     parameters: {
      //       expand:
      //         "to_BusinessPartnerCustomer,to_BusinessPartnerAddrFilter,to_BusinessPartnerSalesArea,to_BusinessPartnerCustomerCo,to_BusinessPartnerRole",
      //     },
      //     events: {
      //       dataReceived: (oDataEvent) => {
      //         var sSalesAreaPath =
      //           "/ZOTC_C_BPSalesAreaTP(BusinessPartner='',SalesOrganization='',DistributionChannel='',Division='',IsActiveEntity=false)";
      //         salesOrg.bindElement({
      //           path: sSalesAreaPath,
      //           parameters: { groupId: _sDeferredGroupId },
      //         });

      //         this._olView.addDependent(this.createPersonDialog);
      //         this._olView.setBusy(false);
      //         this.createPersonDialog.open();
      //       },
      //     },
      //   });
      return true;
    },

    _oFragment: function (sBusinessPartnerCategory) {
      if (sBusinessPartnerCategory === "1") {
        return sap.ui.xmlfragment(
          this._olView.getId(),
          "oup.otc.business.partner.ext.fragment.CreatePersonDialog",
          this
        );
      } else {
        return sap.ui.xmlfragment(
          this._olView.getId(),
          "oup.otc.business.partner.ext.fragment.CreateOrganizationDialog",
          this
        );
      }
    },

    _isChangesPending: function (oContext, olController, fnCallBack) {
      if (!this._olView.getModel().hasPendingChanges()) {
        fnCallBack(oContext, olController);
      } else {
        jQuery.sap.delayedCall(1000, this, this._isChangesPending, [
          oContext,
          olController,
          fnCallBack,
        ]);
      }
    },

    _discardDraft: function (oContext, that) {
      var oModel = that._olView.getModel();
      var mParametersDraftDiscard = {
        success: function () {
          that.createPersonDialog.setBusy(false);
          that.createPersonDialog.close();
          sap.m.MessageToast.show(
            that._oResourceBundle.getText("ST_GENERIC_OBJECT_DELETED")
          );
        },
      };
      oModel.remove(oContext.getPath(), mParametersDraftDiscard);
    },
  };
});
