(function() {
  var FixedHeader;

  FixedHeader = function(systemConstants) {
    var directive;
    directive = {
      link: function(scope, elem, attributes) {
        var body, globalHeader, header, processTrail, scrollHandler;
        header = elem[0];
        globalHeader = document.querySelector('.header-global');
        processTrail = document.querySelector('.process-trail');
        if (attributes.parent) {
          body = document.querySelector(attributes.parent);
        } else {
          body = header.parentNode;
        }
        scrollHandler = function(ev) {
          var bodyRect, globalHeaderRect, headerRect, processTrailRect;
          bodyRect = body.getBoundingClientRect();
          headerRect = header.getBoundingClientRect();
          globalHeaderRect = globalHeader.getBoundingClientRect();
          processTrailRect = processTrail.getBoundingClientRect();
          if (bodyRect.top <= globalHeaderRect.height + processTrailRect.height) {
            angular.element(body).addClass('is--header-fixed');
            angular.element(body).css({
              'padding-top': headerRect.height + 'px'
            });
            angular.element(header).css({
              'top': globalHeaderRect.height + 'px',
              'width': (bodyRect.width - 1) + 'px'
            });
            if (bodyRect.height + bodyRect.top - globalHeaderRect.height <= headerRect.height * 2) {
              return angular.element(header).css({
                'top': bodyRect.height + bodyRect.top - (headerRect.height * 2) + 'px'
              });
            }
          } else {
            angular.element(body).removeClass('is--header-fixed');
            angular.element(body).css({
              'padding-top': '0'
            });
            return angular.element(header).css({
              'opacity': '1',
              'width': 'auto'
            });
          }
        };
        return window.addEventListener('scroll', scrollHandler);
      }
    };
    return directive;
  };

  angular.module('aptCPQUI').directive('fixedHeader', FixedHeader);

}).call(this);
