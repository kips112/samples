<?php
/**
 * Created by Natori Hanzo in PhpStorm.
 * Date: 25.03.14 5:45
 */

namespace Battle;


/**
 * Собирает лог боя
 * Class log
 * @package Battle
 */
class log
{

    public $battle; //анимация
    public $turn; //ход при анимации
    public $anim;
    public $text; // текст логи боя
    public $mode;
    public $round; // номер раунда
    public $allLoot;


    public $firstRow; // первая строка без переноса

    public $tmpl;

    public $table; //табличка с логом боя
    public $reportTable; //табличка с логом боя
    public $battleRep; // массив с финальными таблицами

    private $reg;
    private $lang;
    private $icons;


    function __construct($mode, \registry $reg) {
        $this->reg = $reg;
        $this->lang = $this->reg->getSetting('lang');
        $this->icons = $this->reg->getSetting('icons');

        $this->firstRow = true;

        $this->allLoot = [1 => "", 2 => ""]; // суммарный дроп для каждой стороны - выводится в таблице
        $this->battle = [];
        $this->turn = [];
        $this->text = '';
        $this->round = 0;
        $this->mode = $mode;

        $this->reportTable = [];

        $this->table = [1 => '', 2 => ''];

        $this->tmpl = [];
        $this->tmpl['battle_info'] = gettemplate('battle_info'); //темплейт для одной из сторон
        $this->tmpl['battle_info_row'] = gettemplate('battle_info_row'); //темплейт для линии с данными игрока
        $this->tmpl['battle_info_2sides'] = gettemplate('battle_info_2sides'); //темплейт для общей таблицы


        $animatedModes = [
            'skel', 'bers', 'clan_training', 'glory', 'valor'
        ];

        $this->anim = false;
        if (in_array($mode, $animatedModes)) {
            $this->anim = true;
        }
    }

    /**
     * вставляет разрыв в лог боя каждый новый раунд
     *
     * @param $Round
     * @param $AverageSideCount
     */
    public function newRound($Round, $AverageSideCount) {
        if ($AverageSideCount > 1 && $Round > $this->round) {
            $this->text .= "<br/>";
        }
        $this->round = $Round;

        $Round++;
        $this->text .= "<div class='round'>Раунд {$Round}</div>";
        $this->firstRow = true;
    }

    /**
     * Сохраняем ход для анимации
     * работает только если есть анимация
     * @param $A
     * @param $B
     */
    public function animStoreTurn($A, $B) {
        if ($this->anim) {
            if (!empty($A)) { //hp1
                $this->turn['hp' . $A['side']] = $A['curr_hp'];
            }
            if (!empty($B)) { //hp2
                $this->turn['hp' . $B['side']] = $B['curr_hp'];
            }
            $this->turn['res'] = $this->text;
            $this->battle[] = $this->turn;
            $this->turn = [];
            $this->text = '';
        }
    }

    /**
     *  * Сохраняем действие(класс, который мы присвоем анимации дейсвия) в анимации боя
     * работает только если есть анимация
     * @param $act
     * @param $A
     */
    public function animAct($act, $A) {
        if ($this->anim) {
            $this->turn['actSide'][$A['side']] = $act;
        }
    }

    /**
     * подсвечивает зелёным или красным в зависимости от стороны игрока
     * @param $str
     * @param $A
     * @return string
     */
    public function color($str, $A) {
        $m = ($A['side'] == 1) ? 'af' : 'df';
        return "<span class='{$m}'>{$str}</span>";
    }


    /**
     * Подсвечивает синим
     * @param $str
     * @return string
     */
    public function perk($str) {
        return "<span class='bluetip'>{$str}</span>";
    }

    /**
     * Строка вида игроки такие против других игроков
     * @param $side
     * @return string
     */
    public function getMessageTitle($side) {
        // выводим состав команд
        $fighters = [1 => "", 2 => ""];
        foreach ($side as $num => $i) {
            foreach ($i as $v) {
                if ($v['mob'] != 'slave') {
                    $namelink = $v['mob'] == '' ? "<a href=# onclick='info(\"{$v['id']}\")'>{$v['username']}</a>" : $v['username'];
                    $fighters[$num] .= $namelink . " [{$v['lvl']}][{$v['curr_hp']}/{$v['start_hp']}] ";
                }
            }
        }
        return $this->lang['Battle'] . ' ' . $fighters[1] . ' vs. ' . $fighters[2];
    }

    /**
     * создаем табличку для одной из сторон с краткой инфой по бою
     */
    public function createTableForSide($num) {
        if ($this->anim) {
            $this->lang['team_name' . $num] = '';
        }
        else {
            $this->lang['team_name' . $num] = $this->color($num . $this->lang['Team'], ['side'=>$num]);
        }
        $this->lang['brep_list'] = $this->table[$num];
        $this->lang['team' . $num] = parsetemplate($this->tmpl['battle_info'], $this->lang);
    }

    /**
     * Сохраняем строку в одной из 2х таблиц с именами игроков
     * @param $v
     */
    public function storeInTableRow($v) {

        $num = $v['side'];

        $name_pref = '';
        $reset_name = '';

        $player_text = "";

        if ($v['mob'] == '') {
            $class = 'red';
            $reset_name = $v['reset'] > 0 ? "<span class='dgray3'>({$v['reset']})</span>" : "";
        }
        elseif ($v['mob'] == 'slave') {
            $class = "blue ' title='{$this->lang['Owner']} {$v['owner_name']} ";
        }
        else {
            $class = "blue";
        }

        $deadicon = $v['dead'] ? "<span style='float:right;'>{$this->icons['scull']}</span>" : "";
        $player_text .= "<span class='b {$class}'>{$name_pref}{$v['username']} [{$v['lvl']}]{$reset_name}</span>" . $deadicon;
/*
        if ($this->mode == 'darkarena' || $this->mode == 'clan_raid'
            || $this->mode == 'raid' || $this->mode == 'drake' || $this->mode == 'bers'
            || $this->mode == 'chaosarena' || $this->mode == 'valor' || $this->mode == 'glory'
            || $this->mode == 'gargoyles' || $this->mode == 'trophy' || $this->mode == 'dungeon'
        )
        */
        if(true) // всегда выводим
        { // выводим сколько золота заработал игрок за бой

            $text_reward = '';
            if ($v['loot_get']['cc'] > 0) {
                $text_reward .= $this->icons['cc'] . $v['loot_get']['cc'];
            }
            if ($v['loot_get']['rc'] > 0) {
                $text_reward .= $this->icons['rc'] . $v['loot_get']['rc'];
            }


            $textGold = '';
            if ($v['loot_get']['gc'] > 0) {
                $textGold .= $this->icons['gold'] . $v['loot_get']['gc'];
            }

            if ($v['gold_hit'] > 0) {
                $textGold .= ' + ' . $this->icons['gold'] . $v['gold_hit'];

                if ($v['loot_get']['gc'] > 0) {
                    $textGold = "({$textGold})" . $this->icons['gold'] . ($v['loot_get']['gc'] + $v['gold_hit']);
                }
                $v['loot_get']['gc'] += $v['gold_hit'];
            }
            $text_reward .= $textGold;

            $text_reward = $text_reward != '' ? '<br/>' . $text_reward : '';
            if ($v['mob'] == '') {
                if ($this->mode != 'raid') {
                    if (!empty($v['loot_get']['items'])) {
                        foreach ($v['loot_get']['items'] as $item) {
                            $text_reward .= '<br/>' . printItem($item, false) . ' ';
                        }
                    }
                }

                $player_text .= $text_reward;
                if (isset($v['Raid_Start'])) {
                    $player_text .= '<br/>' . $this->lang['start_raid'];
                }
            }
        }

        $this->lang['br_player'] = $player_text;
        $this->lang['br_exp'] = $v['loot_get']['exp'];
        $this->lang['br_dmg'] = $v['dmg_give_battle'];

        $this->lang['br_kills'] = $v['kills'];

        $this->table[$num] .= parsetemplate($this->tmpl['battle_info_row'], $this->lang);
    }


    /**
     * создаем финальный текст боя с табличкой
     * @param $numPlayers
     * @param $side
     */
    public function finalReport($numPlayers, $side) {
        $this->reportTable['table'] = parsetemplate($this->tmpl['battle_info_2sides'], $this->lang);

        $this->battleRep['battlerep'] = "<div class='fullWidth' style='text-align:center;'>{$this->reportTable['win']}";
        for ($num = 1; $num <= 2; $num++) {

                $win = " <br/><span class='b'>";
                if ($numPlayers[$num] > 1) {
                    $win .= $this->color($num . $this->lang['Team'], $side[$num][0]);
                }
                else {

                    // если один человек с рабами то пишет что получил раб.
                    // поэтому находим игрока
                    foreach ($side[$num] as $p){
                        if ($p['mob']==''){
                            $win .= $this->color($p['username'], $p);
                            break;
                        }
                    }
                }
                $win .= '</span>';

            if (!empty($this->allLoot[$num])) {
                $this->battleRep['battlerep'] .= "{$win} <span class='b dusty'>{$this->lang['got']}:</span> {$this->allLoot[$num]}";
            }
        }

        $this->battleRep['battlerep'] .= "</div>";
        $this->battleRep['battlerep'] .= "<br/>{$this->reportTable['table']}{$this->text}";
    }


    /**
     * Показывает победил игрок - или команда
     * @param $A
     * @param $draw
     * @param $winByHp - режим, когда победа присуждается по оставшейся жизни
     */
    public function winnerTitle($A, $draw, $winByHp) {
        $this->reportTable['win'] = '';
        if ($winByHp) {
            $this->reportTable['win'] = $this->lang['winByHp'] . "<br/>";
        }
        elseif ($draw) {
            $this->reportTable['win'] = $this->lang['draw'];
            return;
        }

        if ($this->anim) {
            $win_text = isset($A['sex']) && $A['sex'] == 1 ? $this->lang['Win2'] : $this->lang['Win1'];
            $this->reportTable['win'] .= "<span class='b dusty'>{$win_text}</span> {$this->color($A['username'] . '!', $A)}";
        }
        else {
            $this->reportTable['win'] .= "<span class='b dusty'>{$this->lang['Win2']}</span> {$this->color($A['side'] . $this->lang['Team'], $A)}!";
        }
        return;
    }
}
