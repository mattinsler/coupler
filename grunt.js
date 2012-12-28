module.exports = function(grunt) {
  
  grunt.loadNpmTasks('grunt-contrib');
  grunt.loadNpmTasks('grunt-simple-mocha');

  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',
    coffee: {
      compile: {
        files: {
          'dist/*.js': 'lib/*.coffee',
          'dist/protocols/*.js': 'lib/protocols/*.coffee',
          'dist/transports/*.js': 'lib/transports/*.coffee'
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