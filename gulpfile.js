// Require packages from node_modules.
const gulp = require('gulp');
const sass = require('gulp-sass');
const sassLint = require('gulp-sass-lint');
const sourcemaps = require('gulp-sourcemaps');
const autoprefixer = require('gulp-autoprefixer');
const browserify = require('browserify');
const fs = require('fs');
const jsonSass = require('json-sass');
const handlebars = require('handlebars');
const gulpHandlebars = require('gulp-handlebars-html')(handlebars);
const notifier = require('node-notifier');
const rename = require('gulp-rename');
const del = require('del');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const browserSync = require('browser-sync').create();


// File paths to source and destination files.
const paths = {
  src: {
    html: './src/views',
    partials: './src/views/partials',
    sass: './src/sass',
    js: './src/js',
    img: './src/img'
  },
  dest : {
    dest: './dist',
    html: './dist',
    css: './dist/css',
    js: './dist/js',
    img: './dist/img',
    partials: './src/views/partials'
  }
};


// Build CSS from SASS with autoprefixer and sourcemaps. Runs SASS Lint first.
gulp.task('css', ['sasslint'], () => {
  return gulp.src(`${paths.src.sass}/**/*.scss`)
    .pipe(sourcemaps.init())
    .pipe(sass({outputStyle: 'expanded'})
    .on('error', function(err) {
      sass.logError.call(this, err);
      notifier.notify({
        title: 'Gulp',
        message: 'SASS error'
      });
    }))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.dest.css))
    .pipe(browserSync.stream());
});


// Lint our SASS. Called by the CSS task and will not build if there are errors.
gulp.task('sasslint', () => {
  return gulp.src(`${paths.src.sass}/**/*.scss`)
    .pipe(sassLint())
    .pipe(sassLint.format())
    .pipe(sassLint.failOnError())
    .on('error', () => {
      notifier.notify({
        title: 'Gulp',
        message: 'SASS liniting failed'
      });
    });
});


// Build our JavaScript with Browserify and sourcemaps.
gulp.task('js', () => {
  return browserify({entries: `${paths.src.js}/app.js`, extensions: ['.js'], debug: true})
    .bundle()
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.dest.js))
    .pipe(browserSync.stream());
});


// Generate a scss partial containing a map from the specified json file.
// Don't bother with this task unless you need media queries in JavaScript.
gulp.task('json-sass', () => {
  return fs.createReadStream(`${paths.src.js}/data/_media-queries.json`)
    .pipe(jsonSass({
      prefix: '$media-queries: '
    }))
    .pipe(source(`${paths.src.js}/data/_media-queries.json`))
    .pipe(rename('_media-queries.scss'))
    .pipe(gulp.dest(`${paths.src.sass}/settings/`));
});


// Copy images from source to destination. In production you probably want to optimise images.
gulp.task('images', () => {
  return gulp.src(`${paths.src.img}/**/*`)
    .pipe(gulp.dest(`${paths.dest.img}`))
    .pipe(browserSync.stream());
});


// Build our HTML from handlebars templates.
gulp.task('html', () => {
  const options = {
    partialsDirectory: paths.src.partials,
    allowedExtensions: ['hbs', 'html']
  };
  return gulp.src([`${paths.src.html}/**/*{hbs,html}`, `!${paths.src.partials}/**/*{hbs,html}`])
    .pipe(gulpHandlebars(null, options))
    .pipe(rename((path) => {
      path.extname = '.html';
    }))
    .pipe(gulp.dest(paths.dest.dest))
    .pipe(browserSync.stream());
});


// Delete generated files. The whole 'dest' folder and the media queries SASS partial (generated by 'json-sass').
gulp.task('clean', () => {
  return del.sync([paths.dest.dest, `${paths.src.sass}/settings/_media-queries.scss`]);
});


// Start a server with browsersync and watch for changes.
gulp.task('watch', ['default'], () => {
  browserSync.init({
    server: {
      baseDir: paths.dest.dest,
      serveStaticOptions: {
        extensions: ['html']
      }
    }
  });
  gulp.watch(`${paths.src.sass}/**/*.scss`, ['css']);
  gulp.watch(`${paths.src.js}/**/*.{js,json}`, ['js']);
  gulp.watch(`${paths.src.img}/**/*.{png,jpg,svg}`, ['images']);
  gulp.watch(`${paths.src.html}/**/*.{html,hbs}`, ['html']);
});


// Do everything except serve and watch.
gulp.task('default', ['clean', 'json-sass', 'css', 'js', 'images', 'html']);
