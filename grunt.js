module.exports = function(grunt) {
  
  grunt.loadNpmTasks('grunt-contrib');
  grunt.loadNpmTasks('grunt-simple-mocha');

  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',
    coffee: {
      compile: {
        files: {
          'lib/*.js': 'lib/*.coffee',
          'lib/protocols/*.js': 'lib/protocols/*.coffee',
          'lib/transports/*.js': 'lib/transports/*.coffee'
        }
      }
    },
    simplemocha: {
      all: {
        src: 'test/**/*.coffee'
      }
    }
  });
  
  grunt.registerTask('test', 'simplemocha');
  // Default task.
  grunt.registerTask('default', 'coffee test');
};