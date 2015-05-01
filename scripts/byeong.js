// Description:
//   당신도 을이 될 수 있습니다 - 당신만의 병을 키워보세요!
//   당신의 병은 여러분이 채팅을 하고 있을 때만 일을 합니다. 오랫동안 자리를 비우면 눈치를 보고 일을 하지 않아요.
//   병이 벌어다 준 돈을 이용해 병의 환경을 개선하고, 더 많은 돈을 버세요!
// Commands:
//   zerobot byeong join - join to byeong game
//   zerobot byeong check - check your byeong's status
//   zerobot byeong upgrade (computer/coffee/project) - upgrade byeong's env.
//   zerobot byeong help - get help
//   zerobot byeong ranking - show ranking


var sprintf = require('sprintf-js').sprintf;

var BYEONG_PLAYERS_KEY = 'BYEONG_DATA';
var CODING_SPEED_BASE = 500;
var MAX_TURN_BASE = 100;
var UPGRADE_PRICE_BASE = 100;
var UPGRADE_MULTIPLIER = 1.3;
var RANKING_MAX = 5;

var JOIN_MESSAGE = '\'byeong join\' to play! or, \'byeong help\' to get informations!'

module.exports = function(robot){
    robot.hear(/.*/i, function(res) {
        var player_id = res.envelope.user.id;
        var player = get_player(robot.brain, player_id);

        if (player === undefined) {
            return;
        }

        var turn_length = get_coding_speed(player.lv_computer);

        var elapsed_time = get_now() - player['last_check'];
        var elapsed_turn = Math.floor(elapsed_time / turn_length);
        var left_time = elapsed_time - elapsed_turn * turn_length;

        player['last_check'] = get_now() - left_time;
        player['pending_turn'] += Math.min(elapsed_turn, get_max_turns(player.lv_coffee));

        set_player(robot.brain, player_id, player);
    });

    robot.respond(/byeong help/i, function(res) {
        res.send('당신도 을이 될 수 있습니다 - 당신만의 병을 키워보세요!\n' +
                '당신의 병은 여러분이 채팅을 하고 있을 때만 일을 합니다. 오랫동안 자리를 비우면 눈치를 보고 일을 하지 않아요.\n' + 
                '병이 벌어다 준 돈을 이용해 병의 환경을 개선하고, 더 많은 돈을 버세요!'
            );
        res.send('join - join to byeong game\n' +
            'check - check your byeong\'s status\n' +
            'upgrade (computer/coffee/project)\n' +
            '....computer: increase line per second\n' +
            '....coffee: increase max line\n' +
            '....project: increase money per line\n' +
            'ranking - show rankings\n');
    });

    robot.respond(/byeong join/i, function(res) {
        var player_id = res.envelope.user.id;
        var player_name = res.envelope.user.name;

        //if (true) {
        if (get_player(robot.brain, player_id) === undefined) {
            add_player(robot.brain, player_id, player_name);
            res.send(sprintf('Hello, %s! \'byeong help\' to get informations!', player_name));
        } else {
            res.send('You are already joined.');
        }
    });

    robot.respond(/byeong check/i, function(res) {game_check(res, robot)});

    robot.respond(/byeong upgrade (.*)/i, function(res) {
        var upgrade_type = res.match[1];

        var player_id = res.envelope.user.id;
        var player = get_player(robot.brain, player_id);

        if (player === undefined) {
            res.send(JOIN_MESSAGE);
            return;
        }

        var key_name;
        if (upgrade_type === 'computer') {
            key_name = 'lv_computer';
        } else if (upgrade_type === 'coffee') {
            key_name = 'lv_coffee';
        } else if (upgrade_type === 'project') {
            key_name = 'lv_project';
        } else {
            res.send('upgrade (computer/coffee/project)');
            return;
        }

        var upgrade_price = get_upgrade_price(player[key_name]);

        if (player['money'] < upgrade_price) {
            res.send(sprintf('Not enough Money (needed %d$, has %d$)', upgrade_price, player['money']));
            return;
        }

        player[key_name] += 1;
        player['money'] -= upgrade_price;

        res.send(sprintf('Upgraded %s!', upgrade_type));

        set_player(robot.brain, player_id, player);
    });

    robot.respond(/byeong ranking/i, function(res) {
        var players = robot.brain.get(BYEONG_PLAYERS_KEY);
        var ranker_count = Math.min(RANKING_MAX, Object.keys(players).length);
        var rankers = [];

        for (player_id in players) {
            var current_lines = players[player_id].total_lines;
            var current_name = players[player_id].name.substring(0, 1) + '_' + players[player_id].name.substring(1);

            rankers.push([current_name, current_lines]);
        }

        rankers.sort(function(a, b){return b[1] - a[1]});

        res.send(sprintf('ranking - TOP %d', ranker_count));
        for (var i = 0; i < ranker_count; i++) {
            res.send(sprintf('#%d: %s (%d lines)', i + 1, rankers[i][0], rankers[i][1]));
        }
    });


    robot.respond(/byeong setup/i, function(res) {
        
        //if (true) {
        if (robot.brain.get(BYEONG_PLAYERS_KEY) === null) {
            res.send('Game started!');
            robot.brain.set(BYEONG_PLAYERS_KEY, {});
        } else {
            res.send('Game is already started.');
        }
    });
    
    /*
    robot.respond(/byeong brain/i, function(res) {
        res.send(JSON.stringify(robot.brain.get(BYEONG_PLAYERS_KEY)));
    });
    */
}

/* game main */

var game_check = function(res, robot) {
    var player_id = res.envelope.user.id;
    var player = get_player(robot.brain, player_id);

    if (player === undefined) {
        res.send(JOIN_MESSAGE);
        return;
    }

    var coded_lines = player['pending_turn'];

    player['pending_turn'] = 0;
    player['lines'] += coded_lines;
    player['total_lines'] += coded_lines;

    var project_size = get_project_size(player.lv_project);
    var project_value = get_project_value(player.lv_project);
    var finished_projects = Math.floor(player['lines'] / project_size);
    var money_earned = Math.floor(finished_projects * project_value * project_size);

    player['lines'] = player['lines'] - Math.floor(finished_projects * project_size);
    player['money'] += money_earned;

    set_player(robot.brain, player_id, player);

    res.send(sprintf('Your byeong finished %d project(s)! (current project: %d/%d lines)',finished_projects ,player['lines'], project_size));
    res.send(sprintf('money: %d$ (+%d), total lines: %d (+%d) / ', player['money'], money_earned, player['total_lines'], coded_lines) +
                sprintf('computer: lv. %d, coffee: lv. %d, project: lv. %d', player['lv_computer'], player['lv_coffee'], player['lv_project']));
}

/* players */
var get_player = function(brain, player_id) {
    var players = brain.get(BYEONG_PLAYERS_KEY);

    if (players === null) {
        return undefined;
    }

    return players[player_id];
};

var set_player = function(brain, player_id, player_data) {
    var players = brain.get(BYEONG_PLAYERS_KEY);
    players[player_id] = player_data;

    brain.set(BYEONG_PLAYERS_KEY, players);
}


var add_player = function(brain, player_id, player_name) {

    var player = {
        'name': player_name,
        'lines': 0,
        'total_lines': 0,
        'money': 0,
        'last_check': get_now(),
        'pending_turn': 0,
        'lv_project': 1,
        'lv_computer': 1,
        'lv_coffee': 1,
    };

    set_player(brain, player_id, player);
}

/* values */
var get_project_value = function(project_level) {
    return 1 + Math.pow(1.05, project_level);
};

var get_project_size = function(project_level) {
    return project_level * 100;
}

var get_coding_speed = function(computer_level) {
    return CODING_SPEED_BASE * (1 + 1 / computer_level);
};

var get_max_turns = function(coffee_level) {
    return MAX_TURN_BASE * coffee_level;
}

var get_upgrade_price = function(level) {
    return UPGRADE_PRICE_BASE * Math.pow(UPGRADE_MULTIPLIER, level);
}

/* extra functions */
var get_now = function() {
    return new Date().getTime();
}