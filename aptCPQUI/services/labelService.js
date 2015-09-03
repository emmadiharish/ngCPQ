(function() {
  var CPQLabels;

  CPQLabels = function() {
    // this.ngCPQLabelsData = ngCPQLabelsData;
    var staticDatalabels = {
      "CustomLabel": {
        "Abandon": "Abandon",
        "AbandonConfirmation": "Abandon Confirmation",
        "Action": "Action",
        "Actions": "Actions",
        "Add": "Add",
        "AddingProduct": "Adding Product",
        "AddMiscellaneousItem": "Add Miscellaneous Item",
        "AddRampRow": "Add Row",
        "AddToCart": "Add to Cart",
        "AllCategoryHierarchies": "All Category Hierarchies",
        "Amount": "Amount",
        "ApprovalReasonInstruction": "Please enter the Approval Reason",
        "ApprovalRequired": "Approval Required",
        "Approvals": "Approvals",
        "AssetCancelled": "This asset is cancelled. This is only provided for preview.",
        "BrowseCatalogLink": "Browse Catalog",
        "BrowseCatalogTitle": "Browse Catalog",
        "BrowseCategories": "Browse",
        "Cancel": "Cancel",
        "CartAccountLocation": "Location",
        "CartNoOptionsAvailable": "No options available.",
        "CartOptionsTable": "Options for",
        "CartViewPageTitle": "Shopping Cart",
        "CatalogProducts": "Catalog Products",
        "CheckItemsBeforeFinalize": "Check Items before Finalizing",
        "ClearAll": "Clear All",
        "CollapseAll": "Collapse All",
        "Configure": "Configure",
        "ConfigureOptionsFor": "Configuration Options for",
        "ConfiguringProduct": "Configuring Product",
        "ConstraintRuleAlert": "Constraint Rule Message",
        "Copy": "Copy",
        "DeletingLineItem": "Deleting Line Item",
        "Detail": "Detail",
        "ExpandAll": "Expand All",
        "FilterAssets": "Filter Asset Results",
        "InstalledProduct": "Purchased Products",
        "Frequency": "Frequency",
        "GuidanceParameters": "Guidance Parameters",
        "GuideMe": "Guide Me",
        "HelpMeChoose": "Guided Selling",
        "Installed": "Installed",
        "LineItems": "Line Items",
        "LoadingAttributes": "Loading Attributes",
        "LoadingPage": "Loading, please wait...",
        "LoadingProducts": "Loading Products",
        "ModifyingOptions": "Modifying Options",
        "More": "More",
        "MyOptions": "My Options",
        "NarrowSearch": "Narrow Your Search",
        "Next": "Next",
        "NoDescriptionProvided": "No description provided for this product.",
        "None": "None",
        "NoRecordsToDisplay": "No records to display",
        "Ok": "OK",
        "OptionColumn": "Option",
        "OptionQuantity": "Qty",
        "Options": "Options",
        "OutOf": "of",
        "Page": "Page",
        "PageCartName": "Apttus - Cart",
        "PageCatalogName": "Apttus - Catalog",
        "PageOptionsName": "Apttus - Options",
        "PercentFrom": "% From",
        "PercentTo": "% To",
        "PoweredByApttus": "Powered By Apttus",
        "Previous": "Previous",
        "PriceBreakdown": "Price Breakdown",
        "PriceFrom": "Price From",
        "PriceRamp": "Price Ramp",
        "PricingGuidance": "Pricing Guidance",
        "PricingGuidanceMaxLabel": "and above",
        "PricingRamps": "Ramps",
        "ProcessingConstraintRules": "Processing Constraint Rules",
        "RampCloseDialog": "Are you sure you want to close without saving?",
        "RampLevel": "Ramp Level",
        "RampStatusColumn": "Status",
        "RampValidationCloseDialog": "The ramp table contains validation errors. Please fix the validation errors before closing the table.",
        "RecommendedProducts": "Recommended Products",
        "RefineSearch": "Refine Your Search",
        "RefreshingData": "Refreshing Data",
        "Remove": "Remove",
        "RemoveConfirmation": "Remove Confirmation",
        "RemoveRampRow": "Remove Row",
        "RemoveRampsRowMsg": "Are you sure you want to remove this row from current ramp ?",
        "RemovingProduct": "Removing Product",
        "ReplacingProduct": "Replacing Product",
        "Repricing": "Repricing - Please wait...",
        "Results": "Results",
        "RuleError": "Error",
        "Save": "Save",
        "SavingForCompare": "Saving for Compare",
        "Search": "Search",
        "SearchHere": "Search here",
        "Selected": "Selected",
        "SelectToCompare": "Compare",
        "SpecifyDetailsFor": "Attributes for",
        "Submit": "Submit",
        "Term": "Term",
        "TierLevel": "TierLevel",
        "TiersCloseDialog": "Are you sure you want to close without saving?",
        "Totals": "Totals",
        "UpdatingPrice": "Updating Price",
        "UpdatingQuantity": "Updating Quantity",
        "UsageTiers": "Usage Price Tiers",
        "Warning": "Warning",
        "WarningUnsavedOptionValues": "Some values have been changed. Please select \"save\" to retain or \"cancel\" to discard changes."
      },
      "CustomField": {
        "FeatureSet__c": {
          "Description__c": "Description"
        }
      }
    };

    this.ngCPQLabelsData = staticDatalabels;
    this.labels = this.ngCPQLabelsData.CustomLabel;
    this.getLabelByKey = function(key) {
      return this.ngCPQLabelsData[key];
    };
    return this;
  };

  CPQLabels.$inject = [];

  angular.module('aptCPQUI').service('ngCPQLabels', CPQLabels);

}).call(this);
