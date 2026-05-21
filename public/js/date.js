const date = new Date();

let
current_date = date.getDate(),
current_month = date.getMonth() + 1,
current_year = date.getFullYear(),
current_hrs = date.getHours(),
current_mins = date.getMinutes(),
current_secs = date.getSeconds(),
current_datetime;

// Add 0 before date, month, hrs, mins or secs if they are less than 0
current_date = current_date < 10 ? '0' + current_date : current_date;
current_month = current_month < 10 ? '0' + current_month : current_month;
current_hrs = current_hrs < 10 ? '0' + current_hrs : current_hrs;
current_mins = current_mins < 10 ? '0' + current_mins : current_mins;
current_secs = current_secs < 10 ? '0' + current_secs : current_secs;

current_datetime = current_year + '-' + current_month + '-' + current_date + ' ' + current_hrs + ':' + current_mins + ':' + current_secs;

console.log(current_datetime);