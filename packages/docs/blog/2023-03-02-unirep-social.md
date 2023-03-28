---
slug: Good-bye-unirep-social
title: Good Bye, UniRep.Social
authors: [chiali]
tags: [prototype, iterate]
---

<iframe src="https://giphy.com/embed/65R80T3r72EGTzlNad" width="480" height="360" frameBorder="0" class="giphy-embed" allowFullScreen></iframe><p><a href="https://giphy.com/gifs/space-force-brian-eno-starf-feet-65R80T3r72EGTzlNad">via GIPHY</a></p>

## Time to Reimagine!
In this post, we'll review our lessons learned and why we decided to sunset unirep.social.
The post is written collaboratively by Chiali, Vivian, Doris with the help of Kichong and a touch of ChatGPT.

Unirep.social was our first-generation prototype, and we built it to learn how to build and leverage the protocol. It was an exciting journey and we're still going.

## The journey so far
Unirep.social is our first experimental social app in the Privacy & Scaling Explorations Team. We wanted it to be familiar, so we took inspiration from popular social media platforms like Reddit, Facebook, and Twitter. In the early design phase, we considered limiting characters in posts, but eventually decided to let users post however they want. We also wanted to protect users' privacy by giving them three epoch keys in each epoch transition, so that it's impossible to identify someone by their traits.

We wanted to balance freedom of speech with empowering users to form communities and gamifying parts of the experience. At first, Unirep.social was just a simple platform for posting, voting, and commenting. But as development continued, we realized it would be better to show how users earned and spent points (rep). To do this, we had to make changes to our synchronizer and backend database.

We found that users sometimes didn't know what they were waiting for, so they would take actions they weren't ready for (such as spending too many points). To prevent these mistakes, we added a queue that stored users' actions and processed them one by one, along with a progress bar to show their recent progress.

Later, we realized that some users might want to be recognized instead of staying anonymous. So, we added a username feature that worked in our circuits, backend, and frontend. This was another big change, and there were still some issues to work out, but the main functions worked well. To make the app more like a general-use social media, we added Topics to posts so users can publish posts under specific topics, and find only the posts that interest them.

Finally, we noticed that there was often confusion between the social media platform "Unirep Social" and the protocol "Unirep". To address this, we decided to rebrand the social media platform and redesign the website to better align with our target audience, based on lessons learned from our experience with Unirep.social.

## Lesson Learned #1: Invite-Only Exclusivity
When we released the pre-alpha, we used an invite-only exclusivity strategy, thinking people would be eager to try it out. However, it only worked 20% of the time, with some attention brought to the application due to Vitalik's promotion. The invite-only exclusivity mechanism only works well when invites can easily be shared. We failed to build a sustainable invite interaction, as the invitation codes were sent manually by email, causing a delay from when a user requested the code to when they received the six-character code, dampening the user's excitement.

### Takeaways & next steps:
Instead of invite-only, the team revisited this strategy and decided that unirep.social should be open to the public, with everyone free to join. We redesigned and built the sign-up flow using Github and Twitter OAuth to have an anti-Sybil mechanism. To avoid overwhelming users with a heavy brain dump during sign-up, we did not show the private key, which is a long text that mixes numbers and characters that is hard to remember. This iteration has made it easier for us to grow our user base, but challenges remain regarding requesting users to download and save their private key.

## Lesson Learned #2: Airdrop
During the initial protocol and pre-alpha, we wanted to give users rep so they could interact in the app per epoch, so we automatically airdropped 30 rep to users. While this was an easy way to get the system started, we soon realized it caused the reputation score to be inaccurate and meaningless because if a user never created a post or interacted in the system, their rep score would still go up. This also caused unfairness to users who joined the system later, as they wouldn't be able to catch up with the rep score compared to users who joined earlier and had piled up for a long time.

### Takeaways & next steps:
Our core contributor, Chance, realized this issue and proposed building a "subsidy" within unirep.social. We built this in the attester, not on the protocol level. The subsidy act like free allowance that system hand out to the users every epoch just for app interactions. It can not be accumulated over time, but in each epoch user get the fair subsidy of 30 points. This does opens the more open interaction, because user is spending the allowance instead of the reputation they have earned hard. Although this does boost more user interaction within the system, but the proving gets a little complex, not only we need to proof the real reputation, there is another set of logic to proof about the allowance, and the allowance that user gives to another users in order to help other earn.


## Lesson Learned #3: Synchronizer
The Unirep protocol originally queried events using queryFilter functions in Ethers.js, which generated all events since deployment and had no storage configuration in the old synchronizer. This led to frequent slow queries of on-chain data and difficulty for applications like Unirep Social to inherit the Unirep synchronizer object.

### Takeaways & next steps:
The team rewrote the  synchronizer for Unirep protocol, which makes it easier to build the synchronizer for Unirep Social and other apps built on top of the protocol. Before, the synchronizer for Unirep Social needed to handle events for both the protocol and the application. Now, events can be separated and the Unirep protocol synchronizer can be extended to applications, which makes it more efficient and easier to manage. 

Users can also customize storage configuration by specifying the database that stores the data history in each event. Synchronization happens only once and storage can be reused to avoid querying on-chain data frequently.


#### Today, we thank you for your support over the past year. 
Thank you for trying our app, finding issues, and pushing us to have a bigger impact. We hope you'll stay tuned for our next project launch, and we look forward to building projects that help our open society.
