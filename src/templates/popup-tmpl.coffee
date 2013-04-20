module.exports = {}
module.exports['history'] = """
<tr>
  <td><%= accessTime %></td>
  <td> <a href="<%= link %>"><img src="<%= thumnail %>" /></a></td>
  <td><p><a href="<%= link %>"><%= title %></a></p></td>
  <td><%= startTime %></td>
</tr>
"""


module.exports['liveInfo'] = """
<li class="<%= flag %>">
  <div class="thumnail">
    <a href="<%= link %>" target="_blank"><img src="<%= thumnail %>" /></a>
  </div>
  <div class="detail">
    <a href="<%= link %>" target="_blank"><%= title %></a>
    <p><span><%= time %></span><span class="status"><%= status %></span></p>
    <p><%= description %></p>
  </div>
</li>
"""
