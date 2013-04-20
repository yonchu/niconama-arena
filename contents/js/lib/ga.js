/* jshint strict: false */
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-40177201-1']);
_gaq.push(['_trackPageview']);
(function() {
  var ga = document.createElement('script');
  ga.type = 'text/javascript';
  ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(ga, s);
})();
if ($ != null) {
  $('#update-button').click(function() {
    _gaq.push(['_trackEvent', $(this).attr('id'), 'clicked']);
  });
  $('#tabbar li').click(function() {
    _gaq.push(['_trackEvent', $(this).data('id'), 'clicked']);
  });
}
