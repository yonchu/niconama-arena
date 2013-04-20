var TMPL = {};
TMPL['history'] = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<tr>\n  <td>'+
((__t=( accessTime ))==null?'':__t)+
'</td>\n  <td> <a href="'+
((__t=( link ))==null?'':__t)+
'"><img src="'+
((__t=( thumnail ))==null?'':__t)+
'" /></a></td>\n  <td><p><a href="'+
((__t=( link ))==null?'':__t)+
'">'+
((__t=( title ))==null?'':__t)+
'</a></p></td>\n  <td>'+
((__t=( startTime ))==null?'':__t)+
'</td>\n</tr>';
}
return __p;
};
TMPL['liveInfo'] = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<li class="'+
((__t=( flag ))==null?'':__t)+
'">\n  <div class="thumnail">\n    <a href="'+
((__t=( link ))==null?'':__t)+
'" target="_blank"><img src="'+
((__t=( thumnail ))==null?'':__t)+
'" /></a>\n  </div>\n  <div class="detail">\n    <a href="'+
((__t=( link ))==null?'':__t)+
'" target="_blank">'+
((__t=( title ))==null?'':__t)+
'</a>\n    <p><span>'+
((__t=( time ))==null?'':__t)+
'</span><span class="status">'+
((__t=( status ))==null?'':__t)+
'</span></p>\n    <p>'+
((__t=( description ))==null?'':__t)+
'</p>\n  </div>\n</li>';
}
return __p;
};
