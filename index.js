var store = require('store');
var utils = require('utils');

var boot = false;

var context = {
    serandives: {
        login: utils.resolve('accounts:///signin')
    },
    facebook: {
        login: 'https://www.facebook.com/dialog/oauth',
        location: utils.resolve('accounts:///auth/oauth'),
        scopes: ['email', 'public_profile']
    }
};


var expires = function (expin) {
    return new Date().getTime() + expin - REFRESH_BEFORE;
};

var next = function (expires) {
    var exp = expires - new Date().getTime();
    return exp > 0 ? exp : null;
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

var loginUri = function (type, location) {
    var o = context[type];
    location = location || o.location;
    var url = o.login + '?client_id=' + o.client;
    url += (location ? '&redirect_uri=' + location : '');
    url += (o.scopes ? '&scope=' + o.scopes.join(',') : '');
    return url;
};

module.exports = function (ctx, next) {
    var token = store.persist('token');
    if (user) {
        ctx.token = token;
        return next();
    }
    next();
};

module.exports.authenticator = function (options, done) {
    done(null, loginUri(options.type, options.location));
};

utils.configs('boot', function (err, config) {
    if (err) {
        return console.error(err);
    }
    var name;
    var clients = config.clients;
    for (name in clients) {
        if (!clients.hasOwnProperty(name)) {
            continue;
        }
        var o = context[name];
        o.client = clients[name];
        var pending = o.pending;
        if (!pending) {
            continue;
        }
        var options = pending.options;
        pending.done(null, loginUri(name, options.location));
        delete o.pending;
    }
    boot = true;
});
