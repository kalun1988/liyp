module.exports = function(grunt) {

    var sassStyle = 'expanded';
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        assemble: {
            options: {
                assets: 'assets',
                plugins: ['permalinks'],
                partials: ['./partials/**/*.hbs'],
                layout: ['./layout/default.hbs'],
                data: ['./data/*.json'],
                expand: true,
                flatten: true
            },
            site: {
                expand: true,
                cwd: 'pages/',
                src: '**/*.hbs',
                dest: './../app/www/'
            }
        },
        sass: {
            output: {
                options: {
                    style: sassStyle
                },
                files: {
                    './../app/www/style/main.css': './scss/main.scss'
                }
            }
        },
        jshint: {
            all: []
        },
        concat: {
            dist: {
                src: ['./script/main.js'],
                dest: './../app/www/script/main.js',
            },
        },
        uglify: {
            compressjs: {
                files: {
                    './../app/www/script/main.min.js': ['./../app/www/script/main.js']
                }
            }
        },
        copy: {
            main: {
                files: [
                    // includes files within path and its sub-directories
                    { expand: true, src: ['./script/*'], dest: './../app/www/' },
                    { expand: true, src: ['./script/*/**'], dest: './../app/www/' },
                    { expand: true, src: ['./images/**'], dest: './../app/www/' },
                    { expand: true, src: ['./storage/**'], dest: './../app/www/' }
                ],
            },
        },
        compress: {
            main: {
                options: {
                    archive: 'archive.zip'
                },
                files: [
                    { expand: true, cwd: './../app/', src: ['**'], dest: './../app/' }, // makes all src relative to cwd
                ]
            }
        },
        watch: {
            handlebars: {
                files: ['./pages/*/**', './layout/default.hbs', './partials/**/*', './pages/**/*'],
                tasks: ['assemble', 'copy', 'compress']
            },
            scripts: {
                files: ['./script/*/**', './script/*'],
                tasks: ['jshint', 'copy', 'compress']
                    // tasks: ['jshint', 'concat', 'uglify']
            },
            sass: {
                files: ['./scss/main.scss'],
                tasks: ['sass']
            },
            livereload: {
                options: {
                    livereload: '<%= connect.options.livereload %>'
                },
                files: [
                    'layout/default.hbs',
                    'style.css',
                    'js/global.min.js'
                ]
            }
        },
        connect: {
            options: {
                port: 9000,
                open: true,
                livereload: 35729,
                // Change this to '0.0.0.0' to access the server from outside
                hostname: 'localhost'
            },
            server: {
                options: {
                    port: 9001,
                    base: './../app/www'
                }
            }
        }

    });


    grunt.loadNpmTasks('grunt-assemble');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-ftp-push');

    grunt.registerTask('outputcss', ['sass']);
    grunt.registerTask('concatjs', ['concat']);
    grunt.registerTask('compressjs', ['concat', 'jshint', 'uglify']);
    grunt.registerTask('watchit', ['assemble', 'sass', 'jshint', 'copy', 'compress', 'connect', 'watch']);
    grunt.registerTask('default');

};
