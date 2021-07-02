import * as shell from 'shelljs';
shell.cp('config/connection.json', './dist/config');
shell.cp('config/default.js', './dist/config');
