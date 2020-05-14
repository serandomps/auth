var utils = require('utils');
var serand = require('serand');

var boot = false;

var context = {
    serandives: {
        login: utils.resolve('accounts:///signin')
    },
    facebook: {
        location: utils.resolve('accounts:///auth/oauth'),
        scopes: ['email', 'public_profile']
    }
};

/*var expires = function (expin) {
    return new Date().getTime() + expin - REFRESH_BEFORE;
};

var next = function (expires) {
    var exp = expires - new Date().getTime();
    return exp > 0 ? exp : null;
};*/

/*var refresh = function (usr, done) {
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
};*/

var loginUri = function (type, location) {
    var o = context[type];
    location = location || o.location;
    var uri = o.login + '?client_id=' + o.id;
    uri += (location ? '&redirect_uri=' + location : '');
    uri += (o.scopes ? '&scope=' + o.scopes.join(',') : '');
    return uri;
};
/*
module.exports = function (ctx, next) {
    var token = store.persist('token');
    if (user) {
        ctx.token = token;
        return next();
    }
    next();
};*/

module.exports.authenticator = function (options, done) {
    done(null, loginUri(options.type, options.location));
};

module.exports.registrar = function (options, done) {
    var o = context.serandives;
    var uri = options.path + '?client_id=' + o.id;
    uri += (options.location ? '&redirect_uri=' + options.location : '');
    done(null, uri);
};

module.exports.signin = function (o) {
    return function (ctx, next) {
        var location = ctx.query.redirect_uri

        serand.persist('state', {
            location: location
        });

        module.exports.authenticator({
            type: 'serandives',
            location: o.loginUri
        }, function (err, uri) {
            if (err) {
                return next(err);
            }
            serand.redirect(uri);
        });
    };
};

module.exports.force = function (ctx, next) {
    if (ctx.token) {
        return next();
    }
    var location = ctx.path;
    var self = utils.resolve('accounts://');
    if (location.indexOf(self) === 0) {
        location = location.substring(self.length);
    }
    serand.persist('state', {
        location: location
    });
    serand.redirect('/signin');
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
        var client = clients[name];
        var key;
        for (key in client) {
            if (!client.hasOwnProperty(key)) {
                continue;
            }
            o[key] = client[key];
        }
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
