(function() {
  var CartLabel, cartLabelLink;

  cartLabelLink = function(scope, elem, attr) {
    var cart, header, scrollHandler;
    scrollHandler = function() {
      header = header || document.querySelector('.cart-header');
      cart = cart || document.querySelector('.main-cart-wrapper');
      if (cart && header && angular.element(cart).hasClass('main-cart-wrapper--header-fixed')) {
        var newTop = header.getBoundingClientRect().height - cart.getBoundingClientRect().top - 60 + 'px';
        elem.css({
          'top': newTop
        });
      } else {
        elem.css({
          'top': '0'
        });
      }
    };
    return window.addEventListener('scroll', scrollHandler);
  };

  CartLabel = function() {
    var directive;
    directive = {
      link: cartLabelLink
    };
    return directive;
  };

  angular.module('aptCPQUI').directive('cartLabelField', CartLabel);

}).call(this);
