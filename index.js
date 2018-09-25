var sera = require('sera')
var store = require('store')

var expires = function (expin) {
    return new Date().getTime() + expin - REFRESH_BEFORE;
};

var next = function (expires) {
    var exp = expires - new Date().getTime();
    return exp > 0 ? exp : null;
};

var initialize = function () {
    var usr = serand.store('user');
    if (!usr) {
        return emitup(null);
    }
    console.log(usr);
    var nxt = next(usr.expires);
    if (!nxt) {
        return emitup(null);
    }
    refresh(usr, function (err, usr) {
        findUserInfo(usr, function (err, usr) {
            if (err) {
                console.error(err)
                return
            }
            emitup(usr);
        });
    });
};

var refresh = function (usr, done) {
    done = done || serand.none;
    if (!usr) {
        return done('!user');
    }
    $.ajax({
        token: true,
        method: 'POST',
        url: utils.resolve('accounts:///apis/v/tokens'),
        data: {
            grant_type: 'refresh_token',
            refresh_token: usr.refresh
        },
        contentType: 'application/x-www-form-urlencoded',
        dataType: 'json',
        success: function (data) {
            usr.access = data.access_token;
            usr.refresh = data.refresh_token;
            usr.expires = expires(data.expires_in);
            emitup(usr);
            console.log('token refresh successful');
            var nxt = next(usr.expires);
            console.log('next refresh in : ' + Math.floor(nxt / 1000));
            later(function () {
                refresh(user);
            }, nxt);
            done(null, usr);
        },
        error: function (xhr) {
            console.log('token refresh error');
            emitup(null);
            done(xhr);
        }
    });
};

module.exports = function (ctx, next) {
    var user = store.persist('user')
    if (user) {
        ctx.user = user
        return next()
    }
    next()
}
