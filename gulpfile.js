/**
 * 作者: bullub
 * 日期: 16/10/14 16:07
 * 用途:
 */
const gulp = require("gulp");
const cwVueAppPack = require("./src");
const babel = require('gulp-babel');

gulp.task("example", function () {
    gulp.src("example/**/*.vue")
        .pipe(cwVueAppPack())
        .pipe(gulp.dest("build/"))
});