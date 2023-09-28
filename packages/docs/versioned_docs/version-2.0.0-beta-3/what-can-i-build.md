---

title: what can i build with unirep
---

# What Can I Build With UniRep?

### UniRep is a generalized protocol that enables developers to build any type of application that needs to manage user data anonymously. Here are a few examples to illustrate the broad range of applications that could be developed:

**Peer-to-Peer Anonymous Lending:**
 - One problem with current decentralized lending protocols is that they rely on the credit system being over-collateralized. With UniRep, reputational data could represent the credit score of a prospective borrower that will change based on their level of compliance with the credit rules of the lending protocol. Users could then prove their credit-worthiness in a system that would not require over-collateralization.

**Eth or Token Attesters:**
- It is possible to create an attester where the data values are assigned to represent an amount ETH or some Token. This would enable anonymous transfer of ownership of the represented token.. 

**Anonymous GitHub:**
- Some developers may desire the ability to publish code anonymously. In A GitHub-type application built with UniRep, the data values could be assigned to represent the number of commits a developer has made to a repository, the number of stars they have on their profile, or if they have made successful PRs to a project. These reputation metrics can then be evaluated to grant the anonymous developer access to push to the main branch of a particular repository.

**Journalism Applicaitons:**
- Some countries have restrictive laws governing speech. If a journalist makes a statement or reveals information that is in conflict with their government's messaging, there may be serious repercussions for that individual. With a UniRep application built to support freedom of the press, a journalist could prove that they are associated with a reputable news organization without revealing their identity, and display a badge from that organization when they publish their work. This would enable readers to trust the source of the reporting, and prevent governments or other power-wielding entities from discovering it.

**Reddit built with UniRep:**
- The most important reputation value in Reddit is the karma users earn. If we built Reddit with UniRep, users could accumulate karma while participating across various forums with unique anonymous identifiers, without associating those activities to their persistent account. Additional features could be built into the platform, where users would prove their ownership of X karma to unlock access to some status Y or some action Y. One proof of concept built by the UniRep team that aims to do this is [UniRep Social](https://about.unirep.social/goodbye/).

### Multi-Attester Applications:
**Social Applications:**
- It is possible to build attesters that interact with each other. For instance, a social media application could contain multiple membership groups. Let's say group X has their own reputation value called "Doge" and group Y has their reputation value called "Elon". If a member from group Y earns 50 "Elon" then they could be granted access to group X that requires at least 50 "Doge" to join. The rules of how to earn these reputation values would be defined by each group's attester, and multi-attester applications can be designed to interact with each other in any number of ways.

**Medical Records:**
- A problem in the Electronic Health Records industry is the lack of interoperability between different healthcare providers. If you go to Hospital X because you live in California, they will store your records in their system. If you go to Hospital Y in New York because you get seriously injured, they will have no idea about your medical background because of poor (or no) systems for sharing records. Even the sharing of records between providers in the same city can come with long delays and major hassles for patients. With UniRep, a user's medical records could be attested to them by each provider at the time of service. When a provider required access to a record, the user would prove with zk that the requested data is theirs. The user would always be in control of their own records, and any stored medical data would be anonymous. In this case each provider would be an attester in an interoperable multi-attester system. Please note: this is only an example, and in dealing with sensitive data such as medical histories, we must keep in mind that new cryptography (like zero-knowledge proofs) may be broken in 50 years.