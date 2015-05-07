function Chat(opts) {

    this.me = {};
    this.clans = {};
    this.socket = !1;
    this.chatting = 1;

    this.myId = opts['myId'];

    this.chat_line_div_obj = !1;
    this.private_line_div_obj = !1;
    this.clan_line_div_obj = !1;
    this.chat_input = !1;
    this.allowedSpeak = !1;
    this.currently_scrolling = {'chat': !0, 'private': !0, 'clan': !0};
    this.private = {};
    this.onlineList = {};
    this.clanpath = opts['clanpath'];

    this.online = !1;
    this.admins = {'admin': 'Админ', 'moder': 'Модератор'};
    this.moderation = false;
    this.mod_player = {};

    this.tab = {id: 'chat'};
    this.chat_tabs = {'chat': '', 'private': '', 'clan': ''};

    this.smiles = new Array('tv', 'cofee', 'rose', 'kiss', 'smile', 'sad', 'wink', 'yes', 'acute', 'aggressive', 'agree', 'angel', 'angel2', 'baby',
        'bb', 'beach', 'beee', 'beer', 'biggrin', 'boast', 'boks', 'boks2', 'bow', 'bye', 'confused', 'cray', 'crazy', 'cry', 'sword', 'dance3', 'dance4',
        'dont', 'rofl', 'drink', 'drinks', 'flowers', 'focus', 'friday', 'friends', 'girl_impossible', 'give_heart2', 'give_rose', 'good', 'good3', 'hi',
        'hello', 'gent', 'eek', 'fie', 'fingal', 'grust', 'heart', 'help', 'hug', 'idea', 'inv', 'jeer', 'king', 'king2', 'kiss2', 'kiss3', 'kiss4', 'laugh',
        'lick', 'love2', 'loveya', 'mad', 'maniac', 'man_in_love', 'mda', 'mdr', 'mol', 'music', 'no', 'nono', 'ok', 'pirate', 'ponder', 'red', 'fe', 'rotate',
        'row', 'rupor', 'tease', 'tongue', 'tongue2', 'trup', 'nnn', 'privet', 'queen', 'scratch_one-s_head', 'search', 'secret', 'shuffle', 'smash', 'smil',
        'smoke', 'sneeze', 'str', 'super', 'scare', 'pleasantry', 'on_the_quiet2', 'jester', 'susel', 'fight', 'wizard', 'sun', 'moon', 'vampire', 'exec',
        'swordman', 'assassin', 'ric11', 'ric40', 'barbar', 'castle', 'horse', '119', '16_8', '20', '32', '44', '80', '86', 'a022', 'a073', 'a078', 'c060',
        'c107', 'c108', 'c160', 'Cherna-facepalm', 'crigon_01', 'crigon_03', 'facepalm', 'facepalm_1', 'kez_03', 'kidrock_01', 'kidrock_02',
        'kidrock_03', 'kidrock_04', 'kidrock_05', 'kidrock_07', 'lex_02', 'lokomotiv', 'popope', 's38', 'scooby_03', 't139067', 't140034', 't140045', 't1910',
        't1918', 't1927', 't1929', 't2408', 't2411', 't2416', 't2418', 'tatice_03', 'uchiru');

    this.colors = [
        "6d3333",
        "FF0000",
        "0000FF",
        "008000",
        "B22222",
        "FF7F50",
        "9ACD32",
        "FF4500",
        "2E8B57",
        "DAA520",
        "D2691E",
        "5F9EA0",
        "1E90FF",
        "FF69B4",
        "8A2BE2",
        "00FF7F"
    ];

    this.smiles_div = !1;
    this.colors_div = !1;
    this.socket = null;
    this.showModes = {'showPrivate': 'off', 'showClan': 'off', 'beepPrivate': 'off', 'showColor': '6d3333', 'newLines': 'bottom'};
    this.showModesInit = {'showPrivate': 'off', 'showClan': 'off', 'beepPrivate': 'off', 'showColor': '6d3333', 'newLines': 'bottom'};
    this.notify = new Audio("./pic/sounds/notify.wav");
}

Chat.prototype = {
    init: function () {
        var self = this;

        this.chat_input = $("#chat_text_input");

        this.chat_online = $('#online_counter');
        this.online = $('#online');

        this.socket = $("#socket");
        var socket = this.socket;

        for (var i in this.showModes) {
            var Mode = $.cookie(i);
            if (Mode) {
                this.showModes[i] = Mode;
                if (Mode == 'on') {
                    $('[name=' + i + ']').prop('checked', true);
                }

                if (Mode == 'top' || Mode == 'bottom') {
                    $('[name=' + i + '][value=' + Mode + ']').prop('checked', true);
                }

            }
        }

        for (var x in this.chat_tabs) {
            $('#' + x + ' .tse-scroll-content')
                .on('scroll', function (x, self) {
                    return function () {
                        self.set_scrolling(x);
                    }
                }(x, this));
        }

        if (this.myId == 0) {
            self.chat_add_text('Вы автоматически вышли! Перезайдите в игру!');
        }
        else {

            socket.emit = function (event, data) {
                data = data || {};
                data.me = {
                    id: self.myId
                };
                $.ajax({
                    dataType: 'json',
                    type: 'post',
                    async: true,
                    url: "chat.php?e=" + event,
                    data: data,
                    success: function (resp) {
                        self.socket.trigger(resp['event'], resp['data']);
                    }
                });
            };
            socket.emit('join');
        }

        socket.on('hello', function (event, data) {
            //   console.log(data);
            self.me = data.me;
            self.me.color = self.showModes['showColor'];
            self.clans = data.clans;
            self.chat_add_text('Добро пожаловать, ' + self.me.username + '!');
            if (data['mod']) {
                self.mod_moderate_act({act: 'add', p: data['mod']});
            }
            self.connected();
        });

        socket.on('send', function (event, data) {
            if (data == 1) {
                self.chatting = true;
                self.socket.emit('refresh');
                self.heartbeat(true);
                self.chatting_timer();
            }
        });


        socket.on('mes', function (event, data) {

            if (data.chat) {
                for (var i in data.chat) {

                    if (!data.chat[i]['type']) {
                        self.chat_add_line(data.chat[i]);
                    }

                    else {
                        //==== MOD MESSAGE =======================================================
                        var mdata = data.chat[i];

                        //   console.log(mdata);

                        var text = '';

                        var p_id = mdata['player2']['p_id'];

                        if (mdata.type == "moder assign") {
                            self.chat_add_text(mdata['player']['username'] + ' назначил <span class="moder"><a></a></span> модератором ' + mdata['player2']['username'], mdata.time);
                            self.refreshOnline(p_id, {key: 'admin', value: 'moder'});
                        }

                        if (mdata['type'] == 'moder remove') {
                            self.chat_add_text(mdata['player']['username'] + ' снял права модератора с ' + mdata['player2']['username'], mdata.time);
                            self.refreshOnline(p_id, {key: 'admin', value: false});
                        }

                        if (mdata['type'] == 'mod act') {

                            if (mdata['mod']['act'] == 'silence') {

                                text = mdata['player']['username'] + ' назначил <span class="mute"><a></a></span>молчание на ' + mdata['player2']['username'] + ' сроком ' + self.timeleft(mdata['mod']['timeleft']);
                                if (mdata['mod']['delmes']) {
                                    $('.chat_from_' + mdata['player2']['p_id']).remove();
                                    text += ' (сообщения удалены).';
                                }
                                if (mdata['mod']['why'] != '') {
                                    text += ' <span class="tx_mod">' + mdata['mod']['why'] + '</span>';
                                }
                            }
                            self.chat_add_text(text, mdata.time);

                            self.refreshOnline(p_id, {key: 'mod', value: mdata['mod']});
                        }

                        if (mdata['type'] == 'mod remove') {
                            if (mdata['mod']['act'] == 'silence') {
                                text = mdata['player']['username'] + ' cнял молчание с ' + mdata['player2']['username'];
                            }
                            self.chat_add_text(text, mdata.time);

                            self.refreshOnline(p_id, {key: 'mod', value: 'false'});
                        }


                        if (mdata['player2']['p_id'] == self.me['p_id']) {
                            //   console.log(mdata);
                            if (mdata['type'] == 'moder assign') {
                                self.me['admin'] = 'moder';
                            }

                            if (mdata['type'] == 'moder remove') {
                                self.me['admin'] = false;
                            }

                            if (mdata['type'] == 'mod remove') {
                                self.mod_moderate_act({act: 'remove'});
                            }

                            if (mdata['type'] == 'mod act') {
                                self.mod_moderate_act(mdata);
                            }
                        }
                    }
                    //==== MOD MESSAGE =======================================================


                }

                if (self.tab && self.tab['id'] != 'chat') {
                    $('#tab-chat').addClass('new');
                    self.chat_tabs['chat'] = 'N';
                } else {
                    self.scroll_chat();
                }

            }

            if (data.priv) {

                var hasPrivate = false;
                for (var i in data.priv) {
                    self.chat_add_line(data.priv[i], true);
                    if (data.priv[i].p_id != self.me.p_id) {
                        hasPrivate = true;
                    }
                }

                if (self.showModes['beepPrivate'] == 'on' && hasPrivate) {
                    self.notify.play();
                }

                if (self.tab && self.tab['id'] != 'private') {
                    $('#tab-private').addClass('new');
                    self.chat_tabs['private'] = 'N';

                } else {
                    self.scroll_chat('private');
                }

            }


            if (data.clan) {

                for (var i in data.clan) {
                    self.chat_add_line(data.clan[i], false, true);
                }

                if (self.tab && self.tab['id'] != 'clan') {
                    $('#tab-clan').addClass('new');
                    self.chat_tabs['clan'] = 'N';
                } else {
                    self.scroll_chat('clan');
                }
            }

            if (data.priv && self.showModes['showPrivate'] == 'on' || data.clan && self.showModes['showClan'] == 'on') {
                if (self.tab && self.tab['id'] != 'chat') {
                    $('#tab-chat').addClass('new');
                    self.chat_tabs['chat'] = 'N';
                } else {
                    self.scroll_chat();
                }
            }


        });

        socket.on('online', function (event, data) {
            self.onlineList = data;
            self.show_online_list(data);
        });

        socket.on('mod_user', function (event, data) {
            self.mod_answer(data);
        });

        socket.on('error', function (event, e) {
            self.chat_add_text('Ошибка: ' + (e ? e : 'неизвестная ошибка'));
            self.socket.stopTime('chat');
            self.socket.stopTime('online');
        });

        socket.on('text', function (event, e) {
            self.chat_add_text('>> ' + (e ? e : 'неизвестная ошибка'));

        });

        socket.on('empty', function (event, e) {
        });

    },

    chat_clear: function () {
        var name = '#' + this.tab['id'] + '_line_list';
        $(name).html('');

        if (this.tab['id'] == 'private') {
            this.socket.emit('clear_private');
        }
    },

    refreshOnline: function (p_id, data) {
        for (var iter in this.onlineList) {
            if (this.onlineList[iter]['p_id'] == p_id) {
                this.onlineList[iter][data['key']] = data['value'];
                break;
            }
        }
        this.show_online_list(this.onlineList);
    },
    connected: function () {
        if (this.me['mod'] == false) {
            this.allowedSpeak = true;
        }

        this.socket.emit('refresh');
        this.socket.emit('online');
        this.heartbeat();
        this.chatting_timer();
        this.heartbeatOnline();
    },

    heartbeat: function (restart) {
        if (restart) {
            this.socket.stopTime('chat');
            this.chatting = 1;
        }
        var self = this;
        var chat_delay = this.chatting ? '10s' : '30s';
        this.socket.oneTime(chat_delay, 'chat', function () {
            self.socket.emit('refresh');
            self.heartbeat();
        });
    },

    heartbeatOnline: function (restart) {
        if (restart) {
            this.socket.stopTime('online');
            this.socket.emit('online');
        }
        var self = this;
        this.socket.oneTime('90s', 'online', function () {
            self.socket.emit('online');
            self.heartbeatOnline();
        });
    },

    chatting_timer: function () {
        var self = this;
        if (this.chatting) {
            this.socket.stopTime('ticker');
            this.socket.oneTime('60s', 'ticker', function () {
                self.chatting = false;
            });
        }
    },
    chat_add_line: function (a, priv, clan) {
        this.line_count++;
        //    console.log(a);
        var color = '';
        var back_li_color = '';


        if (priv) {
            color = ' tx_privat';
            //    back_li_color = ' t_red';
        } else {

            if (a.p_id == this.me.p_id) {
                // цвет нашего текста
                // color = ' tx_my';
            }

            if (clan) {
                back_li_color = ' t_green';
            }
            else {
                //    back_li_color = ' t_white';
            }

            if (a['text'].indexOf(this.me.username) > -1) {
                color = ' tx_named';
            }
        }
        var to = a['to'] || '';
        if (to != '') {
            to = '<b>' + to + '</b>';
        }

        this.smiles.forEach(function (i) {
            if (a['text'].search(":" + i + ":") > -1) {
                var img = '<img class="smile" src="./pic/smiles/' + i + '.gif" onclick="my_chat.add_smile(\'' + i + '\')" />';
                var str = new RegExp(":" + i + ":", "g");
                a['text'] = a['text'].replace(str, img);
            }
        });

        var $chatDiv;
        var nameMode = 'name';

        if (priv) {
            $chatDiv = $("#private_line_list");
            nameMode = 'private';
        } else if (clan) {
            $chatDiv = $("#clan_line_list");
        }
        else {
            $chatDiv = $("#chat_line_list");
        }
        if (priv && this.showModes['showPrivate'] == 'on' || clan && this.showModes['showClan'] == 'on') {
            $chatDiv = $("#chat_line_list");
        }

        var line = '<li class="chat_from_' + a.p_id + back_li_color + ' ">' + '<span class="ts">' + a.time + '</span>' + this.getname(a, true, nameMode) + to + ' ' + '<span class="tx' + color + '">' + a['text'] + '</span></li>';


        if (this.showModes['newLines'] == 'top') {
            $chatDiv.prepend(line);
        } else {
            $chatDiv.append(line);
        }

        /*
         var ni = this.line_count- 2;

         if (ni<0) {ni=0}
         $('#chat_line_list li').slice(0, 5).css('border', '2px dashed blue');
         */
    },
    chat_add_text: function (text, ts, list) {
        ts = ts || '';
        list = list || '#chat_line_list';
        this.line_count++;

        var line = '<li><span class="ts">' + ts + '</span> ' + text + '</li>';
        if (this.showModes['newLines'] == 'top') {
            $(list).prepend(line);
        } else {
            $(list).append(line);
        }

    },
    getname: function (a, o, nameMod) {
        var showMod = o == undefined ? true : o;

        nameMod = nameMod || 'private';

        var color = a['color'] || '6d3333';
        color = "#" + color;

        var link = "<span style='color:" + color + "'>" + a.username + "</span>";

        var mod = '';
        var mod0 = '';


        if (a.p_id != this.me.p_id) {

            if (this.me.admin && showMod) {
                mod = '<span class="eye"><a href="#" title="Модерация" onclick="my_chat.mod(\'' + a.p_id + '\'); return false;"></a></span>';
            }

            link = '<a onclick="add_name(\'' + a.username + '\',\'' + a.p_id + '\',\'' + nameMod + '\')">' + link + '</a>';
        }
        else {

        }


        //  if (a.p_id == this.me.p_id) {

        if (a.admin != undefined && a.admin != false) {
            mod0 = '<span class="' + a.admin + '"><a title="' + this.admins[a.admin] + '"></a></span>';
        }
        return mod0 + mod + this.clanpic(a) + '<span class="name" >' + link + '</span><span class="lvl"><a title="Инфо" onclick="open_info(\'' + a.p_id + '\')">[' + a.lvl + ']</a></span>';
    },
    clanpic: function (data) {
        var pic = this.clanpath + data.clan + '_small.gif';
        return data.clan == 0 ? '' : '<span class="clan_small"><img title="' + this.clans[data.clan] + ' " src="' + pic + '"/></span>';
    },
    mod: function (p_id) {
        if (!this.moderation) {
            this.moderation = true;
            var socket = this.socket;
            socket.emit('mod', {mod: 'user', id: p_id});
        }
    },

    mod_answer: function (data) {
        this.mod_player = data;
        $('#pl_name').html(this.getname(data['player'], false));
        $('#mod_mods').html('');
        data.mods.forEach(function (i) {
            $('#mod_' + i).clone().appendTo('#mod_mods').children('form').attr('id', 'mod_' + data['player']['p_id']);
        });

        var h = $('.chat_back').height();
        var $opt = $('#player_info');
        if (h < 400) {
            $opt.css({top: 'initial', bottom: '20px'})
        }
        else {
            $opt.css({top: '4px', bottom: 'initial'})
        }

        $opt.fadeIn('fast');
    },

    mod_assign_moder: function () {
        if (this.moderation) {
            var socket = this.socket;
            socket.emit('mod', {mod: 'moder assign', id: this.mod_player['player']['p_id']});
        }
        this.close_info();
    },

    mod_remove_moder: function () {
        if (this.moderation) {
            var socket = this.socket;
            socket.emit('mod', {mod: 'moder remove', id: this.mod_player['player']['p_id']});
        }
        this.close_info();
    },

    mod_remove: function (act) {
        if (this.moderation) {
            var socket = this.socket;
            socket.emit('mod', {mod: 'mod remove', id: this.mod_player['player']['p_id'], act: act});
        }
        this.close_info();
    },

    mod_moderate: function () {
        if (this.moderation) {
            var a = $('#mod_' + this.mod_player['player']['p_id']).serializeArray();
            var socket = this.socket;
            socket.emit('mod', {mod: 'mod act', id: this.mod_player['player']['p_id'], mods: a});
        }
        this.close_info();
    },
    mod_moderate_act: function (data) {
        if (data.act == 'remove') {
            this.me['mod'] = false;
            this.chat_input.prop('disabled', false).val('');
            this.allowedSpeak = true;
        }
        if (data.act == 'add') {
            this.me['mod'] = data['mod'];
            this.chat_input.prop('disabled', true).val(this.mod_print(this.me, this.me['mod']['timeleft'], true));
            this.allowedSpeak = false;
        }
    },

    mod_print: function (p, timeleft, textOnly) {
        var text = '';
        var mod = p['mod'];
        //    console.log(textOnly + ' textOnly');
        if (mod) {
            if (mod.act == 'silence') {
                text = 'Молчание ' + this.timeleft(timeleft);
                if (!textOnly) {
                    text = '<span class="mute"><a title="' + text + '"></a></span>';
                }
            }
        }
        return text;
    },
    add_smile: function (a) {
        if (this.me['mod'] == false) {
            this.chat_input.val(this.chat_input.val() + ':' + a + ':');
        }

        this.moveCursorToEnd(this.chat_input.get(0));
        this.chat_input.focus();
    },
    chat_smiles: function () {

        if (!this.smiles_div) {
            this.smiles_div = $('#smiles');
            $('#smiles_list').html('');
            this.smiles.forEach(function (i) {
                var a = '<img class="smile" src="./pic/smiles/' + i + '.gif"  onclick="my_chat.add_smile(\'' + i + '\')" />';
                $('#smiles_list').append(a);
            });
        }


        var h = $('.chat_back').height();

        if (h < 400) {
            this.smiles_div.css({top: 'initial', bottom: '20px'})
        }
        else {
            this.smiles_div.css({top: '4px', bottom: 'initial'})
        }


        this.smiles_div.fadeIn('fast');
    },
    chat_smiles_close: function () {
        this.smiles_div.fadeOut('fast');
        this.chat_input.focus();
    },
    chat_rules: function () {
        $('#rules').fadeIn('fast');
    },
    chat_rules_close: function () {
        $('#rules').fadeOut('fast');
        this.chat_input.focus();
    },

    chat_options: function () {
        if (!this.colors_div) {
            this.colors_div = $('#chat_colors');
            this.colors_div.html('');
            var $colors = this.colors_div;
            var self = this;
            this.colors.forEach(function (i) {
                var j = '';
                if (self.showModes['showColor'] == i) {
                    j = 'current ';
                }
                j += i;
                var a = '<a class="chat_color_swatch ' + j + '" href="#" onclick="my_chat.color(\'' + i + '\'); return false;" style="background-color:#' + i + '"></a>';
                $colors.append(a);
            });
        }

        var $opts = $('#options');
        var h = $('.chat_back').height();

        if (h < 400) {
            $opts.css({top: 'initial', bottom: '20px'})
        }
        else {
            $opts.css({top: '4px', bottom: 'initial'})
        }
        $opts.fadeIn('fast');
    },

    color: function (color) {
        this.colors_div.find('.' + this.me.color).removeClass('current');
        this.colors_div.find('.' + color).addClass('current');
        this.me.color = color;
    },

    chat_options_close: function () {

        var newLines = this.showModes['newLines'];
        var doRefresh = false;

        this.showModes = this.showModesInit;
        var a = $('#chat_opts').serializeArray();
        var self = this;
        a.forEach(function (i) {
            self.showModes[i['name']] = i['value'];
            if (i['name'] == 'newLines' && newLines != i['value']) {
                doRefresh = true;
            }
        });

        // запоминаем цвет
        this.showModes['showColor'] = this.me.color;

        for (var i in this.showModes) {
            $.cookie(i, this.showModes[i],{
                expires: 360
            });
        }

        $('#options').fadeOut('fast');
        if (doRefresh) {
            window.location.href = "index.php";
        }
    },
    chat_colors: function () {
        if (!this.colors_div) {
            this.colors_div = $('#chat_colors');
            this.colors_div.html('');
            var $colors = this.colors_div;
            this.colors.forEach(function (i) {
                var a = '<a class="chat_color_swatch ' + i + '" href="#" onclick="CurrentChat.user_color(\'#' + i + '\'); return false;" style="background-color:#' + i + '">&nbsp;</a>';
                $colors.append(a);
            });
        }
    },
    moveCursorToEnd: function (el) {
        if (typeof el.selectionStart == "number") {
            el.selectionStart = el.selectionEnd = el.value.length;
        } else if (typeof el.createTextRange != "undefined") {
            el.focus();
            var range = el.createTextRange();
            range.collapse(false);
            range.select();
        }
    },
    add_name: function (name, id, nameMod) {

        nameMod = nameMod || 'private';

        if (nameMod == 'private') {
            var $private_names = $("#private_names");
            //show private names
            if ($private_names.text() == "") {
                $("#private_names_wrap").removeClass('hidden');
            }

            if (id != this.me.p_id) {
                if ($("span#" + id).length == 0) {
                    $private_names.prepend('<span id="' + id + '" class="private">' + name + '<span class="removePrivate"><a title="Удалить" onclick="remove_private(\'' + id + '\')">x</a></span></span>');
                }
            }
        }
        if (nameMod == 'name') {
            this.chat_input.val(this.chat_input.val() + name + ', ');
        }
        this.moveCursorToEnd(this.chat_input.get(0));
        this.chat_input.focus();

    },
    remove_private: function (id) {
        $("span#" + id).remove();

        //hide private names
        if ($("#private_names").text() == "") {
            $("#private_names_wrap").addClass('hidden');
        }

    },
    parsePrivate: function () {
        this.clearAllPrivate();
        var p = this.private;
        var str = '';
        $("#private_names").find("span.private").each(function () {
            // отрезаем х в конце
            str = $(this).text();
            str = str.substring(0, str.length - 1);
            p[$(this).attr('id')] = str;
        });
    },
    clearAllPrivate: function () {
        this.private = {};
    },
    chat_say: function () {

        if (this.me['mod']) {
            this.chat_input.val(this.mod_print(this.me, this.me['mod']['timeleft'], true));
        }
        else {
            this.parsePrivate();
            var go = true;
            if (this.tab && this.tab['id'] == 'private') {
                if (this.isEmpty(this.private)) {
                    this.chat_add_text('Укажите адресата для приватного сообщения', '>>', '#private_line_list');
                    this.scroll_chat('private');
                    go = false;
                }
            }

            if (this.tab && this.tab['id'] == 'clan') {
                if (this.me['clan'] == 0) {
                    this.chat_add_text('Вы должны вступить в клан, перед тем, как писать сообщения в клановый чат', '>>', '#clan_line_list');
                    this.scroll_chat('clan');
                    go = false;
                }
            }

            if (go) {
                var b = this.chat_input.val();
                b = b.replace(/\s+/g, ' ');
                if (b.length > 0 && b != ' ') {
                    b.length > 512 && (b = b.substr(0, 512));
                    this.last_attempted_message = b;
                    this.say(b);
                    this.chat_input.val('');
                    this.clearAllPrivate();
                }
            }
        }
    },
    say: function (a) {
        var socket = this.socket;
        var chatline = {
            'text': a,
            'color': this.me.color
        };

        if (!this.isEmpty(this.private)) {
            chatline.pr = this.private
        }

        if (this.tab && this.tab['id'] == 'clan') {
            chatline.clan = this.me.clan;
        }

        socket.emit('send', chatline);
    },
    online_get: function () {
        this.heartbeatOnline(true);
    },
    show_online_list: function (data) {
        this.online.html('');

        var self = this;
        var sort = [];

        var count = 0;

        for (var i in data) {
            sort.push(i);
            count++;
        }

        this.chat_online.text('(' + count + ')');

        sort.sort(this.sIncrease);

        sort.forEach(function (i) {

            if (self.me['mod'] && data[i]['p_id'] == self.me['p_id'] && data[i]['mod']) {
                self.me['mod']['timeleft'] = data[i]['mod']['timeleft'];
                self.chat_input.val(self.mod_print(self.me, self.me['mod']['timeleft'], true));
            }

            if (data[i]['p_id'] == self.me['p_id'] && data[i]['mod'] == false && self.me['mod']) {
                self.mod_moderate_act({act: 'remove'});
            }

            var text = self.mod_print(data[i], data[i]['mod']['timeleft'], false);
            self.online.append('<li>' + self.getname(data[i]) + text + '</li>');

        });
    },
    set_scrolling: function (a) {
        a || (a = 'chat');
        var b = this.chat_lines_div(a);
        if (this.showModes['newLines'] == 'top') {
            this.currently_scrolling[a] = b.scrollTop() == 0;
        }
        else {
            this.currently_scrolling[a] = (b.prop('scrollHeight') - b.scrollTop() == b.outerHeight());
        }
    },

    chat_lines_div: function (a) {
        a || (a = 'chat');
        var div = !1;


        if (a == 'chat') {
            div = this.chat_line_div_obj ? this.chat_line_div_obj : this.chat_line_div_obj = $("#chat .tse-scroll-content");
        }
        else if (a == 'private') {
            div = this.private_line_div_obj ? this.private_line_div_obj : this.private_line_div_obj = $("#private .tse-scroll-content");
        }
        else if (a == 'clan') {
            div = this.clan_line_div_obj ? this.clan_line_div_obj : this.clan_line_div_obj = $("#clan .tse-scroll-content");
        }
        /*
         var dif = div.prop('scrollHeight') - div.scrollTop();
         console.log('here scrollHeight+ ' + div.prop('scrollHeight') + ' scrollTop= ' + div.scrollTop() + ' ' + dif + '== outerHeight=' + div.outerHeight());
         */
        return div;
    },
    scroll_chat: function (a) {
        a || (a = 'chat');

        //   console.log('currently_scrolling =' + a + ' ' + this.currently_scrolling[a]);
        if (this.showModes['newLines'] == 'top') {
            this.currently_scrolling[a] && $("#" + a + ' .tse-scroll-content').animate({ scrollTop: 0 }, 'fast');
        }
        else {
            this.currently_scrolling[a] && $("#" + a + ' .tse-scroll-content').animate({ scrollTop: this.chat_lines_div(a).prop('scrollHeight') }, 'fast');
        }

    },

    scroll_chat_up: function (a) {
        a || (a = 'chat');
        if (this.showModes['newLines'] == 'top') {
            $('#' + a + ' .tse-scroll-content').scrollTop(0);
        } else {
            $("#" + a + ' .tse-scroll-content').animate({ scrollTop: this.chat_lines_div(a).prop('scrollHeight') }, 'fast');
        }
    },

    timeleft: function (mod_time) {

        var days = Math.floor(mod_time / 86400);
        mod_time -= days * 86400;
        var hours = Math.floor(mod_time / 3600);
        var minutes = Math.floor(mod_time / 60) % 60;
        var seconds = Math.floor(mod_time % 60);

        var ret = '';
        if (days > 0) {
            ret += days + ' дн. ';
        }
        if (hours > 0) {
            if (hours < 10)   hours = '0' + hours;
            ret += hours + ' час. ';
        }

        if (minutes > 0) {
            if (minutes < 10) minutes = '0' + minutes;
            ret += minutes + ' мин. ';
        }

        if (seconds > 0) {
            if (seconds < 10) seconds = '0' + seconds;
            ret += seconds + 'с ';
        }
        return ret;
    },

    close_info: function () {
        this.mod_player = {};
        $('#player_info').fadeOut('fast');
        this.moderation = false;
    },
    isEmpty: function (o) {
        for (var p in o) {
            if (o.hasOwnProperty(p)) {
                return false;
            }
        }
        return true;
    },
    sIncrease: function (i, ii) { // По возрастанию
        if (i > ii)
            return 1;
        else if (i < ii)
            return -1;
        else
            return 0;
    }
};
