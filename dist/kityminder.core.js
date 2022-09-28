/*!
 * ====================================================
 * <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>
<%= pkg.homepage ? " * " + pkg.homepage + "\n" : "" %> * GitHub: <%= pkg.repository.url %> 
 * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>; Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>
 * ====================================================
 */

(function () {

use('expose-kityminder');
})();