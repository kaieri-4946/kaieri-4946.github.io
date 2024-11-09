async function loadSongMasterData()
{
	const profile = `http://127.0.0.1/api/game/ongeki/data/musicList`

	return await(await fetch(profile)).json()
}

function toDiffString(diff)
{
	switch(+diff)
	{
		case 0: return 'basic'
		case 1: return 'advanced'
		case 2: return 'expert'
		case 3: return 'master'
		case 10: return 'lunatic'
	}
}

function getCC(songMasterData, diff)
{
	let cc = 0
	switch(+diff)
	{
		case 0: cc = songMasterData.level0; break
		case 1: cc = songMasterData.level1; break
		case 2: cc = songMasterData.level2; break
		case 3: cc = songMasterData.level3; break
		case 10: cc = songMasterData.level4; break
	}
	
	return +cc.replace(',','.')
}

function getOfficialCC(song, diff)
{
	switch(+diff)
	{
		case 0: return song.basic.const
		case 1: return song.advanced.const
		case 2: return song.expert.const
		case 3: return song.master.const
		case 10: return song.lunatic.const
	}
	
	return '';
}

function getRating(score, cc)
{
    let musicRate;
    if (score >= 1007500) {
        musicRate = cc + 2;
    } else if (score >= 1000000) {
        musicRate = cc + 1.5 + Math.floor((score - 1e6) / 150) * 0.01;
    } else if (score >= 990000) {
        musicRate = cc + 1 + Math.floor((score - 990000) / 200) * 0.01;
    } else if (score >= 970000) {
        musicRate = cc + 0 + Math.floor((score - 970000) / 200) * 0.01;
    } else if (score >= 900000) {
        musicRate = cc - 4 + Math.floor((score - 9e5) / 175) * 0.01;
    } else {
        musicRate = 0;
    }
	
	return musicRate
}

function getRanking(score)
{
	let scoreRank = "D";
    if (score >= 500000) {
        scoreRank = "C";
    }
    if (score >= 600000) {
        scoreRank = "B";
    }
    if (score >= 700000) {
        scoreRank = "BB";
    }
    if (score >= 800000) {
        scoreRank = "BBB";
    }
    if (score >= 850000) {
        scoreRank = "A";
    }
    if (score >= 900000) {
        scoreRank = "AA";
    }
    if (score >= 940000) {
        scoreRank = "AAA";
    }
    if (score >= 970000) {
        scoreRank = "S";
    }
    if (score >= 990000) {
        scoreRank = "SS";
    }
    if (score >= 1000000) {
        scoreRank = "SSS";
    }
    if (score >= 1007500) {
        scoreRank = "SSS+";
    }
	
	return scoreRank
}

async function getSongDetail(songId, songDiff, userId)
{
	const song = `http://127.0.0.1/api/game/ongeki/song/${songId}?aimeId=${userId}`
	
	let songDetail = await(await fetch(song)).json()
	songDetail = (songDetail.filter(function (item){
		return item.level == songDiff
	}))[0]
	
	let result = {
		is_allbreak: songDetail.isAllBreake,
		is_fullcombo: songDetail.isFullCombo,
		is_fullbell: songDetail.isFullBell
	}
	
	return result
}

async function getIntegratedSong(songName)
{
	for (let item of allMusics)
	{
		if(item.title == songName)
		{
			return item
		}
	}
	
	return null;
}

async function parseSongRecord(songRecord, userId)
{
	let record = songRecord.split(':')
	let songDetail = await getSongDetail(record[0], record[1], userId)
	let songMasterData = (allSongMasterData.filter(function (item){
		return item.id == record[0]
	}))[0]
	
	let id = record[0];
	let diff = record[1];
	let score = record[2];
	
	let integratedSong = await getIntegratedSong(songMasterData.name)
	
	let music_id = id
	let cc = getCC(songMasterData, diff);
	
	if(integratedSong)
	{
		music_id = integratedSong.music_id
	}
	
	let result = {
		title: songMasterData.name,
		artist: songMasterData.artistName,
		id: music_id,
		score: score,
		is_allbreak: songDetail.is_allbreak,
		is_fullcombo: songDetail.is_fullcombo,
		is_fullbell: songDetail.is_fullbell,
		rank: getRanking(score),
		diff: toDiffString(diff),
		const: cc,
		rating: getRating(score, cc),
		date: Date.now()
	}
	
	return result
}

async function parseListRecord(listRecords, userId)
{
	let songArray = listRecords.split(',')
	let result = [];
	
	for (let songRecord of songArray)
	{
		if(songRecord[0] == '0')
			continue;
		let song = await parseSongRecord(songRecord, userId)
		result.push(song)
	}
	
	return result
}

async function calculateRating(b30, n15, r10)
{
	let sum = 0
	for (let item of b30)
	{
		sum += +item.rating
	}
	for (let item of n15)
	{
		sum += +item.rating
	}
	for (let item of r10)
	{
		sum += +item.rating
	}
	
	return Math.floor(sum / 55 * 100)/100
}

async function parsePage()
{
	let userId = document.getElementById("osl_id").value
	
	const profile = `http://127.0.0.1/api/game/ongeki/profile?aimeId=${userId}`
	
	const general = `http://127.0.0.1/api/game/ongeki/general?aimeId=${userId}&key=`
	
	const userInfo = await(await fetch(profile)).json()
	const b30 = await(await fetch(general + 'rating_base_best')).json()
	const n15 = await(await fetch(general + 'rating_base_new_best')).json()
	const r10 = await(await fetch(general + 'rating_base_hot_best')).json()
	
	const records = await parseListRecord(b30.propertyValue, userId)
	const new_records = await parseListRecord(n15.propertyValue, userId)
    const rec_records = await parseListRecord(r10.propertyValue, userId)
	
	records.sort(sortByRatingDesc)
	new_records.sort(sortByRatingDesc)
	
	let result = {
		player_name: userInfo.userName,
		rating: await calculateRating(records, new_records, rec_records),
		rating_max: userInfo.highestRating / 100,
		records: records,
		new_records: new_records,
        rec_records: rec_records,
        reachable: 0
	}
	
	return result
}

function sortByRatingDesc(songA, songB)
{
	return +songB.rating - +songA.rating
}

var allSongMasterData
(async function(){
    allSongMasterData = await loadSongMasterData()
})()