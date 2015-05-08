<?php
/**
 * Created by Natori Hanzo in PhpStorm.
 * Date: 23.12.13 23:58
 */
//error_reporting(E_ALL);


class events
{
    use quests;

    /** @var $db mysqldb */
    public $db;
    public $reg;
    private $type;
    private $questList;
    private $questDone;
    private $p_id; // temp;
    private $allowed;
    private $tabs;
    private $filteredTabs;
    public $okIcon = '<img title="ok" src="./pic/i_ok.png"/>';
    public $questionIcon = '<img src="./pic/i_question16.png"/>';
    public $goldIcon = '<img title="G" src="./pic/gold.png"/>';
    public $stoneIcon = '<img title="R" src="./pic/ruby.png"/>';
    public $PremIcon = '<img title="Prem" src="./pic/prem.gif"/>';

    private $items = false;
    private $I; //Items class istance


    public function __construct(registry $reg) {
        $this->reg = $reg;
        $this->db = $reg->getObject('or_db');
        $this->type = $this->getType();
        $this->questList = $this->getQuestList();
        $this->tabs = $this->gettabsList();
    }

    public function check($qid, $event, $param = []) {
        $methods = get_class_methods(__CLASS__);
        $name = $qid . $event;
        if (in_array($name, $methods)) {
            return call_user_func_array([__CLASS__, $name], $param);
        }
        else {

            // определяем стандарные методы инит и награду
            if ($event == '_init') {
                return call_user_func_array([__CLASS__, 'standartQuestInit'], $param);
            }

            if ($event == '_reward') {
                return call_user_func_array([__CLASS__, 'standartQuestReward'], $param);
            }
            return false;
        }
    }

    /**
     * берем из базы список выполненных квестов
     * с параметрами  if ($f['state']=='done' || $f['state']=='fail')
     * стат frozen для статистики ежедневных квестов
     *
     * @param $p_id
     * @return array
     */
    public function myQuestsDone($p_id) {

        // если уже выполняли запрос для этого человека то не выполняем его заново
        if ($p_id == $this->p_id && !empty($this->questDone)) {
            return $this->questDone;
        }

        $quests = [];
        // выполненные квесты
        $this->db->doquery("SELECT * FROM `quest` WHERE `p_id` = '{$p_id}'");
        while ($f = $this->db->getRows()) {
            //заносим только завершенные или проваленные квесты
            if ($f['state'] == 'done' || $f['state'] == 'fail') {
                $quests[$f['name']] = $f;
            }

            if ($f['state'] == 'done' || $f['state'] == 'done frozen') {
                AddOrSetVal($quests['questsCounter'], $f['name'], 1);
            }
        }

        $this->questDone = $quests;
        $this->p_id = $p_id;

        return $quests;
    }


    /**
     * Выдаем список неначатых Заданий или впрогрессе
     * @param $p
     * @return array
     */
    private function allowedQuests(&$p) {


        // выполняемые квесты
        $curr = json_decode($p['quest'], true);

        // при повторном обращении того же игрока при старте квеста выдаем начальные данные
        // просто обновляем их в соответсвии с данными игрока $p['quest']
        // не пересоставляем с выполненными квестами

        if ($p['id'] == $this->p_id && !empty($this->allowed)) {
            $allowed = $this->allowed;
            foreach ($allowed as $id => $f) {
                if (isset($curr[$id])) {
                    //ставим что выполняется квест
                    $allowed[$id]['progress'] = 1;
                    $allowed[$id]['data'] = $curr[$id];

                    if ($this->isFinished($allowed[$id])) {
                        $allowed[$id]['finished'] = 1;
                    }
                }
            }
            return $allowed;
        }


        $done = $this->myQuestsDone($p['id']);

        $this->filteredTabs = $this->allowedTabs($p);

        //квесты равно список минус все невыполнненные и выполняемые
        // и + фильтр по условиям типа квеста - в закладках

        $allowed = $this->questList;

        foreach ($this->questList as $id => $f) {
            if (isset($curr[$id])) {
                //ставим что выполняется квест
                $allowed[$id]['progress'] = 1;
                $allowed[$id]['data'] = $curr[$id];
                if ($this->isFinished($allowed[$id])) {
                    $allowed[$id]['finished'] = 1;
                }
            }
            //квест выполнен или невыполнен и не подходит по критериям закладки, или просто отключен и не взят
            elseif (isset($done[$id]) || !isset($this->filteredTabs[$f['tab']]) || !$f['active']
                || isset($f['require']) && !isset($done[$f['require']]) && !isset($allowed[$f['require']]['finished'])
            ) {
                unset($allowed[$id]);
            }
            elseif (!$this->checkIfQuestAllowed($p, $f)) {
                unset($allowed[$id]);
            }


            //  считаем колво заданий в закладках
            if (isset($allowed[$id])) {
                $this->filteredTabs[$f['tab']]['count'] += 1;
            }
        }

        $this->p_id = $p['id'];
        $this->allowed = $allowed;
        return $allowed;
    }


    /**Промеряем можно ли нам показывать этот квест по параметам квеста
     * @param $p
     * @param $f
     * @return bool+
     */
    protected function checkIfQuestAllowed(&$p, $f) {

        $potions = json_decode($p['potions'], true);

        if (isset($f['reset_limit'])) {
            if ($p['reset'] > $f['reset_limit']) {
                return false;
            }
        }

        if (isset($f['inactive_if_effect']) && $potions) {
            foreach ($potions as $val) {
                if (isset($val['s_robProtect'])) {
                    return false;
                }
            }
        }

        if (isset($f['inactive_if_lvl_less'])) {
            if ($p['lvl'] < $f['inactive_if_lvl_less']) {
                return false;
            }
        }

        return true;
    }

    /**  получаем список доступных табов для игрока с учетом услвоий по группам квестов
     * @param $p
     * @return array
     */
    private function allowedTabs(&$p) {

        $tablist = $this->tabs;

        foreach ($this->tabs as $name => $data) {

            // доступна ли эта вкладка
            $allowed = true;
            $tablist[$name]['count'] = 0;

            // диапазон уровней
            if (isset($data['lvl'])) {
                if ($data['lvl']['min'] > $p['lvl'] || $data['lvl']['max'] < $p['lvl']) {
                    $allowed = false;
                }
            }

            // ресет - точно указан
            if (isset($data['reset'])) {
                if ($data['reset'] != $p['reset']) {
                    $allowed = false;
                }
            }

            if (!$allowed) {
                unset($tablist[$name]);
            };
        }

        return $tablist;
    }

    // получаем список активных неактивных табов и выделяем текущий
    public function getTabs(&$p, &$activeTab) {

        $this->allowedQuests($p);

        if (!isset($this->filteredTabs[$activeTab]) || $this->filteredTabs[$activeTab]['count'] == 0) {
            $activeTab = 'none';
        }
        $text = '';
        foreach ($this->filteredTabs as $tab => $data) {
            if ($activeTab == 'none' && $data['count'] > 0) {
                $activeTab = $tab;
            }

            $state = '';
            if ($data['count'] == 0) {
                // если нет заданий
                $state = 'inactive';
                // вообще не показываем пустые вкладки
            }
            else {

                if ($activeTab == $tab) {
                    $state = 'active';
                }
                $text .= " <div id='{$tab}' class='tab left {$state}'>{$data['name']}</div>";
            }
        }

        return $text;
    }

    public function getAllowed(&$p) {
        return $this->allowedQuests($p);
    }


    public function getHtmlList(&$p, $tab) {

        $questsHere = false;

        $list = '';
        $tabList = ['templates' => [], 'tabs' => '', 'details' => ''];


        $tabbed = false;
        if ($tab == 'daily' || $tab == 'quests') {
            $tabbed = true;
            $tabList['templates']['tabs'] = "<li class='tab'><a href='#{qid}'>{name}{progress}</a></li>";
            $tabList['templates']['tabbed'] = gettemplate('quest_tabbed');
        }


        $tmpl = gettemplate('quest_list');
        $tmpl_finished = gettemplate('quest_list_finished');

        // список заданий
        $allowed = $this->allowedQuests($p);
        foreach ($allowed as $qid => $f) {
            if (isset($this->filteredTabs[$tab]) && $f['tab'] == $tab && ($f['active'] || isset($f['progress']))) {
                $questsHere = true;

                $f['pic'] = !empty($f['title_pic']) ? PIC_DIR . 'quest/' . $f['title_pic'] : '';
                $f['qid'] = $qid;

                if (isset($f['progress']) && $this->isFailed($f)) {

                    $quests = json_decode($p['quest'], true);
                    if ($quests) {
                        unset($quests[$qid]);
                        $p['quest'] = json_encode($quests);
                        $p['update']['quest'] = $this->db->sanitizeData($p['quest']);
                    }

                    $this->saveState('fail', $p, $qid, $allowed[$qid]);

                }

                $f['state'] = $this->check($qid, "_text", [$f]) ? : '?';
                if (!isset($f['progress']) && isset($f['note_text'])) {
                    $f['state'] .= "<p><span class='f14 b dbluetip'>{$f['note_text']}</span>";
                }

                if (isset($f['finished'])) {
                    $currentTmpl = $tmpl_finished;
                }
                else {
                    $currentTmpl = $tmpl;
                }


                if ($tabbed) {
                    if (isset($f['progress'])) {

                        if (isset($f['finished'])) {
                            $f['progress'] = " {$this->okIcon}";
                        }
                        else {
                            $f['progress'] = " {$this->questionIcon}";
                        }
                    }
                    $tabList['tabs'] .= parsetemplate($tabList['templates']['tabs'], $f);
                    $tabList['details'] .= parsetemplate($currentTmpl, $f);
                }
                else {
                    $list .= parsetemplate($currentTmpl, $f);
                }
            }
        }


        if (!$questsHere) {
            $list = "Сейчас этот список пуст.";
        }
        elseif ($tabbed) {
            $list = parsetemplate($tabList['templates']['tabbed'], $tabList);
        }

        return $list;
    }

    public function startQuest(&$p, $qid) {

        $allowed = $this->allowedQuests($p);
        if (isset($allowed[$qid]) && !isset($allowed[$qid]['progress'])) {
            // проверка выполняемых квестов

            $quests = json_decode($p['quest'], true);
            if (!$quests) {
                $quests = [];
            }

            $quests[$qid] = $this->check($qid, "_init", [$allowed[$qid]]) ? : []; // стартуем квест


            //TODO просто не работает квест если чтото пошло не так
            if (empty($quests[$qid])) {
                echo "empty quest";
                return false;
            }


            $p['quest'] = json_encode($quests);

            $p['update']['quest'] = $this->db->sanitizeData(json_encode($quests));

            // получаем текст для ajax запроса при старте квеста
            $allowed = $this->allowedQuests($p); // освежаем данные
            return $this->check($qid, "_text", [$allowed[$qid]]) ? : '?';
        }
        return false;
    }

    public function finishQuest(&$p, $qid) {
        $allowed = $this->allowedQuests($p);

        if (isset($allowed[$qid]) && isset($allowed[$qid]['progress'])) {
            if ($this->isFinished($allowed[$qid])) {
                // подчищаем у игрока и фиксируем выполнение
                $quests = json_decode($p['quest'], true);

                if ($quests) {
                    unset($quests[$qid]);
                    // отмечаем выполнение этого квеста в других квестах

                    foreach ($quests as &$f) {
                        foreach ($f['event'] as $ename => $edata) {
                            if (!isset($edata['complete'])) {
                                if ($ename == "doQuest" && $edata['name'] == $qid) {
                                    $f['event'][$ename]['done']++;
                                    if ($f['event'][$ename]['done'] == $edata['num']) {
                                        $f['event'][$ename]['complete'] = 1;
                                    }
                                }
                            }
                        }
                    }

                    $p['quest'] = json_encode($quests);
                    $p['update']['quest'] = $this->db->sanitizeData($p['quest']);
                }


                $this->saveState('done', $p, $qid, $allowed[$qid]);

                // выдаем награду
                return $this->check($qid, "_reward", [$allowed[$qid], &$p]);
            }
        }
        return false;
    }


    /**
     * Сохраняем в базу результат выполнения квеста
     * @param $state
     * @param $p
     * @param $qid
     * @param $quest
     */
    private function saveState($state, &$p, $qid, $quest) {
        $this->db->insertRecords(
            "quest",
            [
                'time' => time(),
                'p_id' => $p['id'],
                'username' => getChatName($p),
                'name' => $qid,
                'type' => $this->type[$quest['type']]['id'], //хз может пригодицо
                'state' => $state
            ]
        );
    }


    public function printItem($type, $num, $LVL, $data = array('num' => 1), $mod = '') {
        $i = GetDefinedItem($type, $num, $LVL, $data);

        if ($mod == '16x16') {
            $mod = " width='16' height='16'";
        }
        return printItem($i, true, true, $mod);
    }

    /** Проверяем есть ли у этого задания ограничения на выполнение по времени
     * @param $f
     * @return bool
     */
    private function timeleft($f) {
        // если время жестко прописано
        if (isset($this->type[$f['type']]['timeleft'])) {
            return $this->type[$f['type']]['timeleft'];
        }
        // если есть оставшееся время во время выполнения квеста
        if (isset($f['progress']) && isset($f['data']['end'])) {
            return $f['data']['end'] - $f['data']['start'];
        }

        // если инитим время на квест динамически
        if (isset($f['end'])) {
            return $f['end'] - $f['start'];
        }
        return false;
    }

    /** добавляем данные об сроке окончания квеста, если это указано
     * @param $f
     * @param $ret
     * @return mixed
     */
    public function isTimed($f, $ret) {
        if ($timeleft = $this->timeleft($f)) {
            $ret['end'] = time() + $timeleft;
        }
        return $ret;
    }

    private function isFailed(&$f) {
        if (!$this->isFinished($f) && isset($f['data']['end']) && $f['data']['end'] - time() < 0) {
            // удаляем квест в списке заданий
            return true;
        }
        return false;
    }

    /** выводим либо время на выполнение или задание провалено
     * @param $timeleft
     * @param $f
     * @return string
     */
    private function timeleftText($timeleft, $f) {
        $ret = '';
        if ($timeleft) {
            if ($this->isFailed($f)) {
                $ret = "<span class='b red'>Задание Провалено</span>";
            }
            else {
                $ret .= "<p>Осталось " . formattime($f['data']['end'] - time());
            }
        }
        return $ret;
    }

    private function isFinished($f) {
        foreach ($f['data']['event'] as $e) {
            if (!isset($e['complete'])) {
                return false;
            }
        }
        return true;
    }

    private function FinishedText($f) {
        $text = "<span class='b cgreen'>Задание выполнено!</span>";
        $text .= "<p><span onclick='quest_reward(\"{$f['qid']}\")' class='btn_l'>Получить награду</span>";;
        return $text;
    }

    public function start_text($f) { // используется в трейте
        $Aret = ['timeleftText' => '', 'Text' => ''];
        $ret = '';
        // если есть ограничения по времени на квест
        $timeleft = $this->timeleft($f);

        if (isset($f['progress'])) {
            // завершен ли квест
            if ($this->isFinished($f)) {
                $ret = $this->FinishedText($f);
            }
            else {
                $Aret['timeleftText'] = $this->timeleftText($timeleft, $f);

            }
        }
        else {

            $ret = "<span id='{$f['qid']}' onclick='quest_start(\"{$f['qid']}\")' class='btn'>Начать</span>";
            if ($timeleft) {
                $ret .= "<p>Время на выполнение: " . formattime($timeleft);
            }

        }

        $Aret['Text'] = $ret;
        return $Aret;
    }

    // показывает значек ок или слово невыполнено
    public function isComplete($f, $stat) {
        return isset($f['data']['event'][$stat]['complete']) ? $this->okIcon : '(не выполнено)';
    }

    public function standartReward($f, &$p) {
        $text = '';
        $time = time();
        foreach ($f['reward'] as $name => $data) {
            if ($name == 'addExp') {
                $p['exp'] += $data;
                $p['update']['exp'] = $p['exp'];
                $text .= "<p>{$data} Опыта";
            }
            if ($name == 'addGold') {
                $p['gold'] += $data;
                $p['update']['gold'] = $p['gold'];
                $text .= "<p>{$this->goldIcon}{$data} золота";
            }

            if ($name == 'addStone') {
                $p['stones'] += $data;
                $p['update']['stones'] = $p['stones'];
                $text .= "<p>{$this->stoneIcon}{$data} рубинов";
            }

            if ($name == 'addPrem') {
                $p['prem'] += $data * 100;
                $p['update']['prem'] = $p['prem'];
                $text .= "<p>{$data}{$this->PremIcon}";
            }

            if ($name == 'addItem') {

                if (!$this->items) {

                    $this->I = new items($this->reg);
                    $this->items = true;
                }

                if (isset($data['defined'])) {
                    $ddata = $data['defined'];

                    $i = GetDefinedItem($ddata['type'], $ddata['num'], 0, ['num' => $ddata['count']]);

                    // пытаемся сложить бутылки
                    if (!$this->I->TryAddItem($p['id'], $i)) {
                        $this->I->Add($p['id'], $i);
                    }

                    $text .= "<p>" . printItem($i);
                }
            }

            if ($name == 'addEffect') {
                $potions = json_decode($p['potions'], true);
                $potions[] = [
                    $data['name'] => [
                        's' => $time,
                        'e' => $time + $data['time'],
                        'type' => 't',
                        'val' => 0
                    ]
                ];
                $p['update']['potions'] = json_encode($potions);
            }
        }
        return $text;
    }


    public function standartQuestInit($f) {
        $ret = ['start' => time(), 'event' => $f['event']];
        return $this->isTimed($f, $ret);
    }

    public function standartQuestReward($f, &$p) {
        $ret = "<span class='b dbluetip'>Награда получена</span>";
        $ret .= $this->standartReward($f, $p);
        return $ret;
    }


}
