(function() {

    var SearchAssets, SearchAssetsController;

    SearchAssetsController = function ($scope, i18nService) {
        this.labels = i18nService.CustomLabel;
    };

    SearchAssetsController.$inject = ['$scope', 'aptBase.i18nService'];

    SearchAssets = function(systemConstants, AssetService) {
        return {
            scope: {},

            controller: SearchAssetsController,
            controllerAs: 'searchAssetsCtrl',
            bindToController: true,

            link: function(scope, elem, attrs){
                var input = elem.find('input');
                input.on('keypress', function(e){
                    AssetService.searchKey = input.val();

                    var key = e.which || e.keyCode;
                    if (key === 13) {
                        AssetService.searchAssetLineItems(AssetService.searchKey);
                    }
                });
            },

            templateUrl: systemConstants.baseUrl + '/templates/directives/search-assets-block.html'
        }
    };

    SearchAssets.$inject = ['systemConstants', 'AssetService'];

    angular.module('aptCPQUI').directive('searchAssets', SearchAssets);

}).call(this);

