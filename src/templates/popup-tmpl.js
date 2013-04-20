// Generated by CoffeeScript 1.6.2
module.exports = {};

module.exports['history'] = "<tr>\n  <td><%= accessTime %></td>\n  <td> <a href=\"<%= link %>\"><img src=\"<%= thumnail %>\" /></a></td>\n  <td><p><a href=\"<%= link %>\"><%= title %></a></p></td>\n  <td><%= startTime %></td>\n</tr>";

module.exports['liveInfo'] = "<li class=\"<%= flag %>\">\n  <div class=\"thumnail\">\n    <a href=\"<%= link %>\" target=\"_blank\"><img src=\"<%= thumnail %>\" /></a>\n  </div>\n  <div class=\"detail\">\n    <a href=\"<%= link %>\" target=\"_blank\"><%= title %></a>\n    <p><span><%= time %></span><span class=\"status\"><%= status %></span></p>\n    <p><%= description %></p>\n  </div>\n</li>";
