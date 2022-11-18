# Twitter Likes Exporter

I threw this together so I could export all the stuff I've liked on Twitter over the years. I put it up here in the hopes that it will help other people.

I've tried to make it easy to audit if you know JS (it's just one file). I will note that the code is rough and duct-tapey, but it worked for me, it might work for you too.

With that being said, I can make no commitment to maintaining this code, and I take no responsibility for possible violations of Twitter's TOS that come as a result of using this code (see the LICENSE file for a list of other things I don't take responsibility for).

If you're familiar with using Chrome DevTools and running NodeJS, most of this should be self-explanatory, and I've left a couple comments along the way to help you out.

If you're not a developer, here are some tips to get this running (though I recommend getting a developer to help you, as taking technical instructions from a rando on the internet is generally not a great idea):

- You'll need to install [Node.js](https://nodejs.org/en/) (I tested this on version 18, so get that one).
- Look at the top of `index.js` for a list of "things" you'll need to get from Chrome DevTools.
    - You can open Chrome DevTools by typing Ctrl+Shift+I on Windows or Cmd+Alt+I on a Mac.
    - You'll want to click on the "Network" tab
    - Go to the Likes tab on your Twitter profile, then refresh the page.
    - In the Filter field at the top of the tab, type "Likes" (without quotes).
    - In the table there should be a thing that says "Likes?variables=some gibberish", click on that.
    - Look carefully at "Request URL". Your `baseUrl` will be everything up to the question mark.
    - A little after the question mark you'll see "variables=%7B%22userId%22%3A%22" followed by a long number. That's your `userId`.
    - Scroll down to Request Headers, look for `authorization: Bearer somegibberish`. You want the gibberish, but nothing else. That's your `token`, don't post it on the internet ever.
    - A few lines down you'll see `cookie: alotofstuff`, the stuff is your `cookie`, copy it all.
    - Towards the bottom you'll see `x-csrf-token: somemorestuff`, you know the drill.
- To run the script, you'll need to open your computer's Terminal or command line, go to the folder where this code is, and run `npm install` and then `node index.js`.

At the moment I don't have a way to really view this stuff once it's downloaded, but right now just getting some kind of archive seems more important. I'll probably write a viewer later to make it easier to actually read the tweets.