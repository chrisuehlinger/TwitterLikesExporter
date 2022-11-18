import fs from 'fs';
import fetch from "node-fetch";

// Things you'll need to get from the Network tab of Chrome DevTools:
// The base URL (it contains an ID thing that might be unique to you)
let baseUrl = 'https://twitter.com/i/api/graphql/lr2pk7rKqCqLSqWRGRaW5Q/Likes'
// Your userId (in the URL, it comes early in the "variables" querystring)
let userId = "";
// Your token from the Authorization header (don't include the word "Bearer", don't share this with anyone or they can impersonate you)
let token = ''
// Just copy the whole Cookie header
let cookie = ''
// You can find this in the x-csrf-token header
let csrf = '';

let variables = { "userId": userId, "count": 100, "includePromotedContent": false, "withSuperFollowsUserFields": true, "withDownvotePerspective": false, "withReactionsMetadata": false, "withReactionsPerspective": false, "withSuperFollowsTweetFields": true, "withClientEventToken": false, "withBirdwatchNotes": false, "withVoice": true, "withV2Timeline": true };
let features = '%7B%22responsive_web_twitter_blue_verified_badge_is_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22unified_cards_ad_metadata_container_dynamic_card_content_query_enabled%22%3Atrue%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_uc_gql_enabled%22%3Atrue%2C%22vibe_api_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Afalse%2C%22interactive_text_enabled%22%3Atrue%2C%22responsive_web_text_conversations_enabled%22%3Afalse%2C%22responsive_web_enhance_cards_enabled%22%3Atrue%7D'

let tweets = [];
while (true) {
    let url = `${baseUrl}?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${features}`
    let response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Cookie: cookie,
            'X-CSRF-Token': csrf,
        }
    });

    let result = await response.json();
    let entries = result.data.user.result.timeline_v2.timeline.instructions[0].entries;
    tweets = tweets.concat(entries.filter(entry => entry.entryId.startsWith('tweet')));
    let oldcursor = variables.cursor;
    variables.cursor = entries.find(entry => entry.entryId.startsWith('cursor-bottom')).content.value;
    console.log(tweets.length, variables.cursor);
    if (oldcursor === variables.cursor) {
        break;
    }
    await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 1000));
}

await fs.promises.writeFile('rawlikes.json', JSON.stringify(tweets, null, 4));

let profilePicsMap = new Map();
let animatedGifsMap = new Map();
let imagesMap = new Map();
let videosMap = new Map();
tweets.map((tweet, i) => {
    try {
        console.log(i)
        let innerTweet = tweet.content.itemContent.tweet_results.result.core ? tweet.content.itemContent.tweet_results.result : tweet.content.itemContent.tweet_results.result.tweet;
        profilePicsMap.set(innerTweet.core.user_results.result.id, innerTweet.core.user_results.result.legacy.profile_image_url_https);
        let extended_entities = innerTweet.legacy.extended_entities
        if (extended_entities) {
            extended_entities.media.map(entity => {
                if (entity.type === 'video') {
                    let bestVideo = entity.video_info.variants.reduce((acc, variant) => variant.bitrate && variant.bitrate > acc.bitrate ? variant : acc, { bitrate: 0 });
                    videosMap.set(entity.id_str, bestVideo.url);
                } else if (entity.type === 'photo') {
                    imagesMap.set(entity.id_str, entity.media_url_https);
                } else if (entity.type === 'animated_gif') {
                    let bestVideo = entity.video_info.variants.reduce((acc, variant) => variant.bitrate !== undefined && variant.bitrate > acc.bitrate ? variant : acc, { bitrate: -1 });
                    animatedGifsMap.set(entity.id_str, bestVideo.url);
                } else {
                    throw 'Unknown media type: ' + entity.type;
                }
            })
        }
    } catch (err) {
        console.error(err);
        console.log(JSON.stringify(tweet, null, 2));
        throw err;
    }
});


await Promise.all([
    fs.promises.writeFile('profile-pics.json', JSON.stringify(Array.from(profilePicsMap.entries()), null, 4)),
    fs.promises.writeFile('animated-gifs.json', JSON.stringify(Array.from(animatedGifsMap.entries()), null, 4)),
    fs.promises.writeFile('images.json', JSON.stringify(Array.from(imagesMap.entries()), null, 4)),
    fs.promises.writeFile('videos.json', JSON.stringify(Array.from(videosMap.entries()), null, 4)),
])


// If you run into trouble with downloading media, just comment/delete all the code from line 3 to here and run it again.
// If a particular piece of media won't download, you can remove it from the JSON file and try to download it manually in the browser

async function readJson(file) {
    return JSON.parse(await fs.promises.readFile(file))
}

let [
    profilePics,
    animatedGifs,
    images,
    videos
] = await Promise.all([
    readJson('profile-pics.json'),
    readJson('animated-gifs.json'),
    readJson('images.json'),
    readJson('videos.json'),
    fs.promises.mkdir('./media/profile-pics', { recursive: true }),
    fs.promises.mkdir('./media/animated-gifs', { recursive: true }),
    fs.promises.mkdir('./media/images', { recursive: true }),
    fs.promises.mkdir('./media/videos', { recursive: true }),
])

console.log(`Ripping ${profilePics.length} profile pics, ${animatedGifs.length} GIFs, ${images.length} images, ${videos.length} videos.`);

for (let i = 0; i < images.length; i++) {
    if(i > 0) {
        break;
    }
    const image = images[i];
    let id = image[0];
    let url = image[1];
    console.log(`Downloading image ${i + 1} of ${images.length}: ${id} ${url}`);
    try {
        let response = await fetch(url);
        let blob = await response.blob();
        await fs.promises.writeFile(`./media/images/${id}.${url.split('.').pop()}`, Buffer.from(await blob.arrayBuffer(), 'binary'));
    } catch (err) {
        console.error(`Error, retrying in a moment...`, err);
        // Try again in case it was a fluke (there are often timeouts, but after enough retries it usually works)
        i--;
    }
    await new Promise(resolve => setTimeout(resolve, 4 * 1000 + Math.random() * 1000));
}

for (let i = 0; i < animatedGifs.length; i++) {
    if(i > 0) {
        break;
    }
    const animatedGif = animatedGifs[i];
    let id = animatedGif[0];
    let url = animatedGif[1];
    console.log(`Downloading animated GIF ${i + 1} of ${animatedGifs.length}: ${id} ${url}`);
    try {
        let response = await fetch(url);
        let blob = await response.blob();
        await fs.promises.writeFile(`./media/animated-gifs/${id}.${url.split('.').pop()}`, Buffer.from(await blob.arrayBuffer(), 'binary'));
    } catch (err) {
        console.error(`Error, retrying in a moment...`, err);
        // Try again in case it was a fluke (there are often timeouts, but after enough retries it usually works)
        i--;
    }
    await new Promise(resolve => setTimeout(resolve, 4 * 1000 + Math.random() * 1000));
}

for (let i = 0; i < videos.length; i++) {
    if(i > 0) {
        break;
    }
    const video = videos[i];
    let id = video[0];
    let url = video[1];
    console.log(`Downloading video ${i + 1} of ${videos.length}: ${id} ${url}`);
    try {
        let response = await fetch(url);
        let blob = await response.blob();
        await fs.promises.writeFile(`./media/videos/${id}.mp4`, Buffer.from(await blob.arrayBuffer(), 'binary'));
    } catch (err) {
        console.error(`Error, retrying in a moment...`, err);
        // Try again in case it was a fluke (there are often timeouts, but after enough retries it usually works)
        i--;
    }
    await new Promise(resolve => setTimeout(resolve, 4 * 1000 + Math.random() * 1000));
}

for (let i = 0; i < profilePics.length; i++) {
    if(i > 0) {
        break;
    }
    const profilePic = profilePics[i];
    let id = profilePic[0];
    let url = profilePic[1];
    console.log(`Downloading profile pic ${i + 1} of ${profilePics.length}: ${id} ${url}`);
    try {
        let response = await fetch(url.replace('_normal', '_400x400'));
        let blob = await response.blob();
        await fs.promises.writeFile(`./media/profile-pics/${id}.${url.split('.').pop()}`, Buffer.from(await blob.arrayBuffer(), 'binary'));
    } catch (err) {
        console.error(`Error, retrying in a moment...`, err);
        // Try again in case it was a fluke (there are often timeouts, but after enough retries it usually works)
        i--;
    }
    await new Promise(resolve => setTimeout(resolve, 4 * 1000 + Math.random() * 1000));
}