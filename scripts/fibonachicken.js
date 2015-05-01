// Description:
//   ZeroBot Introduce.
//


usage_message = 'USAGE: fibo (치킨|피자|보쌈) (가게명) (인원수)';

module.exports = function(robot){
  robot.respond(/fibo (.*) (.*) (.*)/i, function(res) {
    // get parameters
    var food_type = res.match[1];
    var food_enterprise = res.match[2];
    var food_people = parseInt(res.match[3]);

    // init values
    var pizza_enterprise = {'test': '!'};
    var chicken_enterprise = {'test': '!'};
    var fork_enterprise = {'test': '!'};   

    // for debugging
    res.send('Type: ' + food_type);
    res.send('Enterprise: ' + food_enterprise);
    res.send('People: ' + food_people);

    if (food_people === NaN || food_people < 1) {
        res.send('not valid people');
        res.send(usage_message)
        return;
    }

    if (food_type === '치킨') {
        var selected = chicken_enterprise[food_enterprise];

        if (selected === undefined) {
            res.send('not valid enterprise');
            res.send(usage_message)
            return;
        }

        res.send(selected)
    } else if (food_type === '피자') {
        var selected = pizza_enterprise[food_enterprise];

        if (selected === undefined) {
            res.send('not valid enterprise');
            res.send(usage_message)
            return;
        }

        res.send(selected)
    } else if (food_type === '보쌈') {
        var selected = fork_enterprise[food_enterprise];

        if (selected === undefined) {
            res.send('not valid enterprise');
            res.send(usage_message)
            return;
        }

        res.send(selected)
    } else {
        res.send('not valid type');
        res.send(usage_message)
        return;
    }
  });
}
