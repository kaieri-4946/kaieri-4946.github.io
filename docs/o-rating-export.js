var username;
var rating;

function selectFile() {
    let fileSelector = document.createElement('input')
    fileSelector.type = 'file'
    fileSelector.onchange = e => {
        let file = e.target.files[0]
        let reader = new FileReader()

        username = file.name
        var regexMatch = username.match(/rating-(?<name>[^.]+)\.json/)
        if(regexMatch) username = regexMatch.groups.name

        reader.readAsText(file)
        reader.onload = readerEvent => {
            rating = JSON.parse(readerEvent.target.result)
        }
    }
    fileSelector.click()
}
selectFile()

var musicData
(async function () {
    musicData = await (await fetch(`https://kaieri-4946.github.io/json/music.json`)).json()
    musicData = musicData.music
})()

// Entry point for generating
function parsePage() {
    let ratingModel = {
        best: mapRating(rating.oldBest),
        new: mapRating(rating.newBest, true),
        pscore: mapRating(rating.platinum),
    }

    let finalRating = calcTotalRating(rating.oldBest, rating.newBest, rating.platinum)

    let result = {
        profile: mapProfile(username, finalRating),
        record: [],
        rating: ratingModel
    }

    return result;
}

function calcTotalRating(oldBest, newBest, pscore) {
    let oldRating = 0

    for (let music of oldBest) {
        oldRating += music.rate1000
    }
    oldRating = Math.floor(oldRating / 50)

    let newRating = 0
    for (let music of newBest) {
        newRating += music.rate1000 * 5
    }
    newRating = Math.floor(newRating / 50)

    let platRating = 0
    for (let music of pscore) {
        platRating += music.rate1000
    }
    platRating = Math.floor(platRating / 50)

    return (oldRating + newRating + platRating) / 1000
}

function mapRating(rating) {
    let ratingArray = []
    for (let music of rating.filter(x => x.id != '0')) {
        let data = getMasterData(music)
        let model = mapToWebModel(music, data)
        ratingArray.push(model)
    }
    return ratingArray
}

function getMasterData(music) {
    for (let data of musicData) {
        if (data.name == music.name && data.charts.some(x => x.internalLevel == music.level1000 / 1000)) {
            for (let chart of data.charts) {
                if (chart.internalLevel == music.level1000 / 1000) {
                    return {
                        name: data.name,
                        artist: data.artist,
                        diff: chart.difficulty,
                        cc: chart.internalLevel
                    }
                }
            }
        }
    }

    console.warn(`${music.name} not found`)
    return {
        name: "Unknown",
        artist: "Unknown",
        diff: "BASIC"
    }
}

function mapToWebModel(music, data) {
    return {
        title: data.name,
        artist: data.artist,
        score: music.score,
        diff: toWebModelDiffString(data.diff),
        rank: getRanking(music.score),
        const: +data.cc,
        rating: calculateScoreRating(+data.cc, music.score) + calculateLampScoreRating(music),
        p_rating: data.cc * data.cc * music.stars / 1000,
        p_score: data.cc * data.cc * music.stars / 1000,
        p_star: music.stars,
        update: "1970-01-01",
        lamps:
        {
            is_fullcombo: music.lamp == 'FC' || music.lamp == 'AB',
            is_allbreak: music.lamp == 'AB',
            is_fullbell: music.fullBell,
        }
    }
}

function toWebModelDiffString(diff) {
    return diff.substring(0, 3).toLowerCase();
}

function getRanking(score) {
    if (score >= 1007500) return scoreRank = "SSS+"
    else if (score >= 1000000) return scoreRank = "SSS"
    else if (score >= 990000) return scoreRank = "SS"
    else if (score >= 970000) return scoreRank = "S"
    else if (score >= 940000) return scoreRank = "AAA"
    else if (score >= 900000) return scoreRank = "AA"
    else if (score >= 850000) return scoreRank = "A"
    else if (score >= 800000) return scoreRank = "BBB"
    else if (score >= 700000) return scoreRank = "BB"
    else if (score >= 600000) return scoreRank = "B"
    else if (score >= 500000) return scoreRank = "C"
    else return "D"
}

function calculateScoreRating(cc, score) {
    // Tech score rank lamp added at the end
    if (score == 1010000) return cc + 2 + 0.3
    else if (score >= 1007500) return cc + 1.75 + Math.floor((score - 1007500) / 10) * 0.001 + 0.3
    else if (score >= 1000000) return cc + 1.25 + Math.floor((score - 1000000) / 15) * 0.001 + 0.2
    else if (score >= 990000) return cc + 0.75 + Math.floor((score - 990000) / 20) * 0.001 + 0.1
    else if (score >= 970000) return cc + Math.floor((score - 970000) / 20 * 0.75) * 0.001
    else if (score >= 900000) return cc + Math.floor((score - 970000) / 17.5) * 0.001
    else if (score >= 800000) return cc + Math.floor((score - 900000) / 50) * 0.001
    else if (score > 500000) return (cc - 6) * (score - 500000) / 300000
    else return 0
}

function calculateLampScoreRating(music) {
    if(music.score <= 800000) return 0
    
    let result = 0
    if (music.fullBell) result += 0.05
    if (music.lamp == 'FC') result += 0.1
    if (music.lamp == 'AB') result += 0.3
    if (music.score == 1010000) result += 0.05
    return result
}

function mapProfile(username, finalRating) {
    let result = {
        name: username,
        trophy: "",
        player_level: 1,
        is_premium: true,
        battle_point: 0,
        rating: finalRating,
        money: 0,
        total_money: 0,
        total_play: 0,
    }

    return result;
}