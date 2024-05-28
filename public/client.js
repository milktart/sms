// client-side js
// run by the browser each time your view template is loaded

$(function() {
/*
  $.get('/users', function(users) {
    users.forEach(function(user) {
      $('<li></li>').text(user[0] + " " + user[1]).appendTo('ul#users');
    });
  });
*/

  $('form').submit(function(event) {
    event.preventDefault();
    var username = $('input#username').val();
    var password = $('input#password').val();
    console.log(username)
	console.log(password)
    $.post('/login?' + $.param({username:username, password:password}), function() {
      //$('<li></li>').text(fName + " " + lName).appendTo('ul#users');
      $('input#username').val('');
      $('input#password').val('');
      $('input').focus();
    });
  });
});
