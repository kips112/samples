/**
 * Created by n1 on 10.06.14.
 */

"use strict";
/**
 * Object Interface
 */


/**
 *  hp_max: num, char max hp
 hp_curr: num, char current hp
 hp_short - text, bar
 * @param opts
 * @constructor
 */
var OreemeUi = function (opts) {
    this.opts = opts || null;

    this.countersNames = { // возможные синонимы имён для отображения счетчиков (наличка, сообщения и т.д.)
        'cc': 'crystals',
        'crystals': 'crystals',
        'gold': 'gold',
        'gc': 'gold',
        'soul': 'soul',
        'sc': 'soul',
        'stones': 'stones',
        'rc': 'stones',
        'messages': 'messages',
        'msg': 'messages',
        'prem': 'prem',
        'valor': 'valor', // доблесть
        double: [ // старые значения считаем с двойной точностью
            'stones',
            'soul'
        ]
    };
};

_.extend(OreemeUi.prototype, {
    setOpts: function (opts) {
        var self = this;
        _.each(opts, function (val, key) {
            self.opts[key] = val;
        });
    },

    updateCharHp: function (current, limit) {
        var o = this.opts;
        o.hp_curr = current; // глобальное. хз для чего. может для регена

        if (!limit) {
            limit = o.hp_bar_limit; // устанавливаем лимит хп для страницы чтобы реген знал какой лимит показывать
        }

        var val = {
            min: current,
            max: o.hp_max
        };

        if (o.hp_short && o.hp_short.bar) {

            var percent = this.update_bar(o.hp_short.bar, val, limit, 'bar_hp80', 0);
            //    console.log('percent '+ percent);
            // если у нас небыло хп и отхелились до минимума требуемого то перегружаем страницу
            if (o.reload_after_hpBar_change && o.old_percent) {

                //      console.log('old_percent '+o.old_percent);
                if (o.old_percent < limit && percent >= limit) {
                    //       console.log('here2');
                    location.reload();
                }
            }

            var text = val.min + "<span class='dgray'>/" + val.max + "</span>";
            o.hp_short.text.html(text);
        }
        if (o.hp_full && o.hp_full.bar) {
            this.update_bar(o.hp_full.bar, val, limit, 'bar-', {less: 'red', more: 'green'});
            o.hp_full.text.text(val.min + '/' + val.max);
        }
    },

    updateCharExp: function (current, percent) {
        var o = this.opts;
        o.exp_char_curr = current;
        if (o.exp_full && o.exp_char_max) {
            var val = {
                min: current, // разобратся как считается экспа
                max: o.exp_char_max,
                percent: percent
            };
            this.update_bar(o.exp_full.bar, val, 0, 0, 0);
            // устанавливаем текст
            o.exp_full.text.text(val.min + '/' + val.max);
        }
    },

    updateCharAtacks: function (current) {
        var o = this.opts;
        o.atacks_curr = current;
        if (o.atacks_max && o.atacks_text && o.atacks_rewarded) {
            o.atacks_text.text(current + '/' + o.atacks_max);
            if (current >= o.atacks_rewarded && o.atacks_text.hasClass('lbluetip')) {
                o.atacks_text.removeClass('lbluetip');
            }
            else {
                if (current < o.atacks_rewarded && !o.atacks_text.hasClass('lbluetip')) {
                    o.atacks_text.addClass('lbluetip');
                }
            }
        }
    },

    /**
     * запускает регенерацию жизни у персонажа
     * таймер вешается на селектор
     */
    regenCharHP: function (selector) {
        var regen_timer = 0;
        var hp_rest = 0; // остача от целых хп.
        var o = this.opts;
        o.hp_bar_limit || (o.hp_bar_limit = 20); // лимит по умолчанию
        var self = this;
        selector.everyTime(1000, function (i) {
            selector.trigger("timerTick", i); // глобальный секундомер
            if (o.hp_add > 0 && o.hp_curr < o.hp_max) {
                regen_timer++;
                var new_hp = Math.floor(o.hp_add * regen_timer + hp_rest);

                if (new_hp >= 1) {
                    hp_rest = o.hp_add * regen_timer + hp_rest - new_hp;
                    regen_timer = 0;
                    o.hp_curr += new_hp;
                    if (o.hp_curr > o.hp_max) {
                        o.hp_curr = o.hp_max;
                    }
                    self.updateCharHp(o.hp_curr, o.hp_bar_limit);
                }
            }
        });
    },

    updateRaidHp: function () {
        // жизни списков в рейде
        // жизни мобов
        // кол-во жизни в title
    },

    /**
     * Обновляет bar до нужных процентов, меняет цвет на лимите
     * @param bar
     * @param val min max ||percent
     * @param limit
     * @param class_mod - имя класса цвета
     * @param class_colors параметры less: _red, more: ''
     * @returns {string} процент на баре
     */
    update_bar: function (bar, val, limit, class_mod, class_colors) {
        class_mod || (class_mod = '');
        class_colors || (class_colors = {
            less: "_red",
            more: ""
        });
        // устанавливаем прогресс бар
        var percent;
        if (val.percent) {
            percent = val.percent;
            //    console.log('set percent: ' + percent);
        }
        else {
            percent = Math.floor(val.min / val.max * 100);
        }
        percent = percent.toFixed(2);

        if (limit > 0) { // если есть лимиты то при ноле полностью закрашиваем красным
            var newColor = percent < limit ? class_mod + class_colors.less : class_mod + class_colors.more;
            if (!bar.hasClass(newColor)) {
                bar.removeClass();
                bar.addClass(newColor);
            }
        }
        bar.css({width: percent + '%'});
        return percent;
    },

    formatTime: function (seconds) {
        var s = seconds || 0;
        var m = 0;
        var h = 0;
        var text = '';
        var d = 0;

        if (s > 0) {
            if (s > 59) {
                m = Math.floor(s / 60);
                s = s - m * 60;
            }
            if (m > 59) {
                h = Math.floor(m / 60);
                m = m - h * 60;
            }

            if (h > 24) {
                d = Math.floor(h / 24);
                h = h - d * 24;
                h = h > 9 ? h : "0" + h;
                text = d + "d " + h + "h";
            }
            else {
                if (s < 10) {
                    s = "0" + s;
                }
                if (m < 10) {
                    m = "0" + m;
                }
                h = h > 0 ? h + ":" : "";
                text = h + m + ":" + s + "";
            }
        }
        return text;
    },

    /**
     * обратный отсчет времени, по окончанию (-1) вызывается callback(timer)
     * @param timer
     * @param timeleft
     * @param callback (timer)
     */
    timer: function (timer, timeleft, callback) {
        if (timer) {
            timer.stopTime();
            var self = this;
            timer.text(self.formatTime(timeleft)); // сразу показываем время, чтобы не ждать одну секунду пока обновится
            timer.everyTime(1000, function (i) {
                var tleft = timeleft - i;
                timer.text(self.formatTime(tleft));
                if (tleft <= 0) {
                    timer.stopTime();
                    callback(timer);
                }
            });
        }
    },

    updateCharCounters: function (data) {
        var self = this;
        var counters = self.opts.counters;
        if (counters) {
            _.each(data, function (val, key) {
                var name = key;
                if (self.countersNames[key]) { // использование синонимов имени
                    //   console.log(key + "=" + val);
                    //  console.log(self.countersNames[key]);
                    name = self.countersNames[key];
                }

                if (counters[name]) {
                    var counter = counters[name];

                    var oldVal = counter.text();

                    if (self.countersNames.double.indexOf(name) !== -1) {
                        oldVal = parseFloat(oldVal);
                        oldVal = isNaN(oldVal) ? 0 : oldVal.toFixed(2);
                        val = parseFloat(val);
                        val = isNaN(val) ? 0 : val.toFixed(2);

                    }
                    else {
                        //   console.debug('parseInt');
                        oldVal = parseInt(oldVal, 10);
                        oldVal = isNaN(oldVal) ? 0 : oldVal;
                        val = parseInt(val, 10);
                        val = isNaN(val) ? 0 : val;
                    }

                    counter.text(val);

                    if (oldVal < val) {
                        var color = counter.css('color');
                        counter
                            .animate({color: "#00FF00"}, {queue: true, duration: 450})
                            .animate({color: color}, 450);
                    }
                }
            });
        }
    },

    skirmishBtn_update: function (newtext) {
        var o = this.opts;
        var cc = 1;
        if (o.skirmish_btn) {
            // o.skirmish_btn.button({disabled: false}); // затирает текст старым значением.
            o.skirmish_btn.removeClass('disabled');

            if (newtext) {
                //o.skirmish_btn.button('option', 'label', newtext);
                o.skirmish_btn.html(newtext);
            }
            else {
                var answ = ajax({m: 'getskirmishprice'}, 'post');
                if (answ[0] == 1) {
                    //  o.skirmish_btn.button('option', 'label', answ[1]);
                    o.skirmish_btn.html(answ[1]);
                }
                if (answ['cc']) {
                    cc = answ['cc'];
                }
                else {
                    cc = 0;
                }
            }

            if (o.atacks_curr && o.atacks_max) { // если у нас закончились атаки, то вырубаем кнопу
                if (o.atacks_curr == o.atacks_max) {
                    //   o.skirmish_btn.button({disabled: true});
                    o.skirmish_btn.addClass('disabled');
                }
            }

            if (o.counters.crystals && o.counters.crystals.text() == 0 && cc > 0) {
                //o.skirmish_btn.button({disabled: true});
                o.skirmish_btn.addClass('disabled');
            }
        }
    },

    attackBtn_update: function (mode) {
        var o = this.opts;
        var fullDisable = false;
        if (o.atkButton) {

            //считываем кол-во кристаллов
            var crystals = o.counters.crystals.text();
            crystals = parseInt(crystals, 10);
            crystals = isNaN(crystals) ? 0 : crystals;

            if (o.atacks_curr && o.atacks_max) { // если у нас закончились атаки, то вырубаем кнопу
                if (o.atacks_curr == o.atacks_max) {
                    fullDisable = true;
                }
            }

            o.atkButton.btn.each(function () {
                var $this = $(this);

                if (mode == 'on') { // показываем камни
                    if (!crystals) {
                        $this.button({disabled: true});
                    }
                    $this.find(o.atkButton.cc_text).text(crystals);
                    $this.find(o.atkButton.cc_span).show();
                }
                else {
                    $this.button({disabled: false});
                    $this.find(o.atkButton.cc_span).hide();
                }

                if (fullDisable) {
                    $this.button({disabled: true});
                }
            });

        }
    },

    skirmishBtn_disable: function () {
        if (this.opts.skirmish_btn) {
            //   this.opts.skirmish_btn.button({disabled: true});
            this.opts.skirmish_btn.addClass('disabled');
        }
    },

    // открываем окно отправки сообщения
    newMessageDialog: function (id) {
        var answ = ajax({
            m: 'msg_new_dialog',
            p: id
        }, 'post');
        if (answ[0] == 1) {
            $("#boxinfo-content").html(answ[1]);
            $("#dialog-box").fadeIn('fast');
        }
    },

    /**
     * ленивый инит тултипов
     * data-tip_class = для овверрайда класса тултипа
     * @param selector обязательный
     */
    addTooltip: function (selector) {
        $(document).on("mouseenter", selector, function () {
            var $this = $(this);
            if (!$this.data("tooltipset")) {
                var tipClass = $this.data('tip_class') || "item_oldtip";
                //   console.log($this);
                $this.tooltip({
                    content: function () {
                        return $(this).data('tip');
                    },
                    track: true,
                    items: "[data-tip]",
                    show: false,
                    hide: false,
                    tooltipClass: tipClass
                })
                    .data("tooltipset", 1);
                $this.trigger("mouseenter"); // чтобы сразу показывало тултип
            }
        });
    },

    // действие при пополнении жизни в рейде
    action_hp: function (data) {
        var $bar;
        var $target = $("#" + data['pref'] + data['id']);
        var percent;
        if (!data['hp_max']) {
            // значит нужно брать из дива

            var $hp_text = $target.find(".hp-out");
            var hp = $hp_text.text().split('/');
            var hp_max = hp[1];
            $hp_text.text(data['hp_curr'] + "/" + hp_max);

            $bar = $target.find("div[class^=bar_hp]"); //любой класс

            var hp_limit = 10;
            percent = this.update_bar($bar, {
                min: data['hp_curr'],
                max: hp_max
            }, hp_limit, 'bar_hp', 0);
        }
        else {

            $target.attr('title', data['hp_curr'] + "/" + data['hp_max']);
            $bar = $target.find("div[class^=bar_hp80]"); //любой класс
            percent = this.update_bar($bar, {
                min: data['hp_curr'],
                max: data['hp_max']
            }, this.opts.hp_bar_limit, 'bar_hp80', 0);
        }

        // активируем кнопку атаки и очищаем ошибку
        if (percent >= this.opts.hp_bar_limit) {
            var $attack = $("#atack_m");
            if ($attack && !this.opts.button_attack_custom) {
                $attack.button({
                    disabled: false
                });
            }
            $('#error_m').html('');
        }
    }

});
