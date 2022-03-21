sap.ui.define([], function () {
  "use strict";
  return {
    onInit: function () {
      this._oComponent = this.getOwnerComponent();
      this._oResourceBundle = this._oComponent
        .getModel("i18n")
        .getResourceBundle();
      this._olView = this.getView();
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
        "/C_BusinessPartnerCustomerCreate",
        [],
        urlParameters
      );

      const success = (aResponse) => {
        if (aResponse[0] && aResponse[0].response) {
          var oResponseContext = aResponse[0].response.context;
          if (oResponseContext) {
            // debugger;
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
                oNavController.navigateInternal(oContext);
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

      var salesOrg = this.getView().byId("header::SalesOrg");
      var distChannel = this.getView().byId("header::distChannel");
      var division = this.getView().byId("header::division");
      var currency = this.getView().byId("header::currency");
      var companyCode = this.getView().byId("header::companyCode");
      var reconAccount = this.getView().byId("header::reconAccount");
      var role = this.getView().byId("header::role");

      this.createPersonDialog.bindElement({
        path: oContext.getPath(),
        parameters: {
          expand:
            "to_BusinessPartnerCustomer,to_BusinessPartnerAddrFilter,to_BusinessPartnerSalesArea,to_BusinessPartnerCustomerCo,to_BusinessPartnerRole",
        },
        events: {
          dataReceived: (oDataEvent) => {
            var salesdraftuuid = "00000000-0000-0000-0000-000000000000";
            if (oDataEvent.getParameters().data) {
              salesdraftuuid = oDataEvent.getParameters().data
                .to_BusinessPartnerSalesArea[0].DraftUUID;
            }

            var salesareapath =
              "/C_BusinessPartnerSalesArea(BusinessPartner='',SalesOrganization='',DistributionChannel='',Division='',DraftUUID=guid'" +
              salesdraftuuid +
              "',IsActiveEntity=false)";
            salesOrg.bindElement({
              path: salesareapath,
            });
            distChannel.bindElement({
              path: salesareapath,
            });
            division.bindElement({
              path: salesareapath,
            });
            currency.bindElement({
              path: salesareapath,
            });

            var compcodedraftuuid = "00000000-0000-0000-0000-000000000000";
            if (oDataEvent.getParameters().data) {
              compcodedraftuuid = oDataEvent.getParameters().data
                .to_BusinessPartnerCustomerCo[0].DraftUUID;
            }
            var compcodepath =
              "/C_BusinessPartnerCustCo(BusinessPartner='',CompanyCode='',DraftUUID=guid'" +
              compcodedraftuuid +
              "',IsActiveEntity=false)";
            companyCode.bindElement({
              path: compcodepath,
            });
            reconAccount.bindElement({
              path: compcodepath,
            });

            var roledraftuuid = "00000000-0000-0000-0000-000000000000";
            if (oDataEvent.getParameters().data) {
              roledraftuuid = oDataEvent.getParameters().data
                .to_BusinessPartnerRole[0].DraftUUID;
            }
            var rolepath =
              "/C_BusinessPartnerCustomerRole(BusinessPartner='',BusinessPartnerRole='',DraftUUID=guid'" +
              roledraftuuid +
              "',IsActiveEntity=false)";
            role.bindElement({
              path: rolepath,
            });

            this._olView.addDependent(this.createPersonDialog);
            this._olView.setBusy(false);
            this.createPersonDialog.open();
          },
        },
      });
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
  };
});
