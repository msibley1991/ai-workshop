## 1. On Creative Decisions

- **Spoken:** Now before we get technical, I would like to talk about how we make creative decisions. Nora showed how the more specific instructions you give an LLM are, the more specific your results will be.

  **Text:** Specific Instructions = specific results.

  **Visual:** *generic vs detailed prompt*
  
  **Spoken:** Specific instructions are creative decisions.

  **Text:** Specific instructions = creative decisions.

  **Visual:** *zoom focus on detailed prompt, highlight individual instructions with connector line to bold "creative decisions"*

- **Spoken:** Design school teaches you how to communicate and apply creative decisions. Because of this, we are better equipped than most to make what we want with or without AI, and that's what I'd like to talk about.

  **Text:** Design school teaches *syntax* and *application* of creative decisions. This knowledge enhances capabilities with AI; it does not become irrelevant.

  **Visual:** *illustration utilizing visualised 3-point perspective, (dithered) shading, and composition with connector line to defined terms*

- **Spoken:** However, design school does *not* teach *correct* creative decisions. We instead learn what has worked previously. We learn about the constraints enforced upon previous designers and how they have adapted. Similarly, AI might be built on all published knowledge of creative activity, but it has no innate creativity. It will default to either the average or what the labs say is *correct* every time it can. Only *you* know what you want to exist in the world, and we are at a point where your individual sensibility, your individual taste, can inform your creative decisions at an unprecedented level. But first, let's see how we got here.

  **Text:** Design school does *not* teach *correct* creative decisions. AI will not give you *correct* creative decisions. Only you can determine what feels *correct*.

  **Visual:** *needed*

## 2. State of Digital Media

- **Spoken:** Before a few years ago, digital media was very much constricted by technological limitations, or the technical knowledge of designers. Admittedly, there have been ebbs and flows of periods where personal taste was applied more or less dramatically.

  **Text:** Digital design has been constrained by technical limitations & knowledge.

  **Visual:** *comparison of plain HTML site (caption: beginnings of the web), GeoCities site (caption: websites for everyone), Twitter (caption: platforms and templates).*

- **Spoken:** But, generally speaking, doing anything digital required specialized knowledge in a whole other field. Even today, about half of our education in digital media design is learning how to use a bunch of unintuitive digital programs, which someone has to pay for, that really aren't connected to each other at all, even if we know they function in similar ways. Currently, one of the most lucrative jobs we can aspire to is just figuring out the best way to connect the outputs of these programs in a coherent way. But most people can't afford to hire that person.

  **Text:** Current system = infinite-symbol programs that all do similar but slightly different things for different uses.

  **Visual:** *multiple filetypes scrambled together*

- **Spoken:** So, as the web and digital media became normalised, the vast majority of less technical people opted for the easiest solution that worked and looked "good enough", leading to the proliferation of templates. Admittedly, these have their utility in that you are guaranteed a usable and navigable web presence, but they are often the digital equivalent of a beige apartment you can't really customize. The tragedy is visual thinkers like us were forced into these templates even when we could easily conceive of a more personalised interface, unless we wanted to spend at least a year independently learning web development, or pay someone else a considerable amount to build our vision.

  **Text:** Templates made using the web easy, but boring.

  **Visual:** *comparison image of standard e-commerce page and artist's page using similar template.*

- **Spoken:** So our situation *was* visually interesting and technically challenging, or visually boring and technically easy.

  **Text:** Old way = tech: hard but visuals: interesting or tech: easy but visuals: boring.

  **Visual:** *filetype knot and artist template shown together, lightly bouncing*

- **Spoken:** Now suppose one day it stopped being technically challenging.

  **Text:** But what if it *stopped* being technically challenging to make what you want digitally?

  **Visual:** *1. filetypes merge to center (a la whirlpool) and new symbols: 3D, Texture, Layout, Motion exit to left neatly connected to a central project symbol node which connects to the artist's template which pivots to orthogonal, layered 3D object, layout panels morph to geometric and abstract shapes and patterns.*

- **Spoken:** But, the benefit of the previous model is you knew exactly what each program was meant to be used for. If you get rid of them, what do you do now? More importantly, how do you keep control of your creative decisions and not just make slop?

  **Text:** But old tools had a *purpose*. Old tools bridged traditional skills and digital ability. How can I design by just chatting to a robot? (Spoiler: Chat becomes just 10% of the process)

  **Visual:** *needed*

## 3. Coding Agents

- **Spoken:** Nora has taught you how to generate a website by giving specific instructions to an LLM model in a single chat. In this case that chat is the extent of the model's context and Lovable is the only place you can do anything. But LLMs like Claude have been modified to interact with files on your computer for your own software or web development projects. Particularly, this modified LLM, called a coding agent, can be opened in a folder where you can do and save what you want. This folder can have many files with specific purposes within a folder, and it turns out an LLM's context can too. These files can be rules for the LLM to follow, image references, documents about the project itself, or tools that help you make things for the project. You can think of it as a mini-internet all about your project for the LLM to read. If you thought Prof. Poljicak's emphasis on file folder organisation was a formality before, I promise it becomes very crucial from this point on. But specifically how you organise it is up to you.

  **Text:** A single chat has a limited context window. Using an LLM in a project folder allows context to exist in multiple documents.

  **Visual:** *large prompt with individual decisions highlighted transformed to project folder with connector lines to detailed documents.*

- **Spoken:** It is also common for the project to have an overview document that tells the LLM what the purpose of the project is and how to navigate it. If you're using Claude Code this will be called a CLAUDE.md; other coding agents call it something different. md stands for Markdown, and it's best to just think of it as somewhere between plain text and HTML, so it's easy to read but also easy to organize. I highly recommend getting a free application called Obsidian, which makes Markdown super easy to read and write. Honestly, it's best to just tell the LLM what you are trying to do and imagine how you want it organised and have it write its own overview.

  **Text:** 
  Rules (CLAUDE.md or AGENTS.md): 
  Tells the coding agent what we're doing and where to look. 
  Uses Markdown: legible but organised.

  **Visual:** *Project folder focuses on CLAUDE.md, connector line shows this project's overview page.*
  
  **TODO:** *example link (new tab): CLAUDE.md page*

## 4. Design Systems

- **Spoken:** Say you make a poster. As designers, you spend quite a bit of time on the exact layout, typography, color scheme, graphics, maybe even texture. If you do that for one poster, great, you settle on each choice and call it a day. But what if you and your friends have to make 50 posters for the same company? What if, instead of making a poster, you are making a website with multiple pages? Obviously not every poster or webpage should look the *exact* same. What elements are you keeping the same for all of them? What elements have wiggle room, and maybe you could even define what that "wiggle room" is? And most importantly, how do you tell others all this?
  
  Before everyone had computers, this would be called a brand system. Literal rules for what typeface to use, how big to make certain elements, illustration style, colors to use. Again, before computers, these were written for people and it was hoped the people would follow the rules or at least interpret them to the best of their ability. Nowadays, we call those rules a design system, and we can encode them such that these rules are always followed.

  **Text:** 
  Can you make 1 poster? 
  What about 20 posters? 
  How do you handle collaborators?

  **Visual:** 
  Beat 1: 1 large (max-height) poster (swiss modern style)
  Beat 2: Poster shrinks (to top right) -> duplicates itself by 5 to the right -> those 5 duplicate themselves downward to create 4 rows.
  Beat 3: alternating (ink &  accent) human figures emerge beside each row.

- **Spoken:** This is really just an extension of the idea that the more specific instructions you give an LLM, the more specific your result. Like everything I've been talking about, you can get as general or specific in both instructions and organisation as you want. This is where you want to consider how broad a "creative decision" can be; it applies even to the organisation of such decisions. On a technical level, you will most likely define "sections" of a design system, say "Typography" or "Color Scheme", and define them to the best of your ability in individual documents.

  **Text:** Design system = concrete elaboration of creative decisions, organised in discrete sections

  **Visual:** *project folder comes back with focus on a design folder with connector lines to specific pages.*

  **TODO:** *example link (new tab): design system page*

## 5. Skills

- **Spoken:** One thing you learn about very quickly in LLM-assisted development is skills. These are basically prompts which tell the LLM to do something, which are instantiated by a particular keyword, which you can either tie to a specific project or keep for any project you use. You can think of these like commands in a program, but much more broad. Skills can either tell the LLM the steps it should follow in a task, for instance how to build components to a certain design system. Or, it can dissuade certain actions when performing a task; this is where you'll see a lot of "don't make slop" and "write like a human" skills. Or, my personal favorite skill use case, it can direct how the LLM interacts with you. The one skill I consistently use is called "/grill-me", created by programmer Matt Pocock, which simply tells the LLM to ask you specifically about what you are trying to do so it gets a thorough understanding. This relates to a key issue with skills, which is that many skills other people make basically amount to their method of creative decision making. Now, the level and specific area to which that matters to you is up to you. Perhaps a skill someone wrote that tells the LLM to use a certain coding methodology doesn't bother you, but a skill that tells an LLM how to build a color scheme does. Also, very important, skills can have dangerous instructions, so you need to look heavily into which ones you activate.

  **Text:** Skills: keywords for directions for an LLM to follow. Can be as broad or specific as you want. If written by others, can make decisions for you. Warning: sometimes skills can be malicious.

  **Visual:** *focus on skills folder, connector lines from 3 skills 1. technical workflow 2. Anti-slop skill 3. grill-me to respective documents.*

- **Spoken:** You might be curious about the difference between skills and these design documents as at the end of the day they both are instructions for the LLM to follow. I'd argue skills are more focused on specific commands and these reference documents are closer to guidelines, but the point is you can absolutely build your own workflow and organisation to whatever gets you what you want. In fact, I would say if you have the time and a subscription, you should research and play around with using different skills and documentation setups. You also need to consider the specificity and cohesion of all these sets of rules because they can absolutely have second-order effects. For instance, if a skill says all display text should be one weight and your design system says another, it's a genuine gamble over what the LLM will actually produce.

  **TODO:** *example link (new tab): formatted /grill-me session*

## 6. MCPs

- **Spoken:** So far, I have mostly talked about making rules for what the LLM should do, but none of that is really designing anything yourself. For most of us it's a hell of a lot easier to just make something in some software and figure out the details later. But how do you get an LLM to work with something made somewhere else? Theoretically you can save an image of whatever you designed and tell the coding agent to make something out of that, but 1. LLMs are actually worse with images than you might think. 2. For a lot of software, it's now pretty easy for the LLM to directly interact with it. This is achieved through MCPs. This stands for Model Context Protocol and it's basically a set of skills and tools that tell the LLM how to interact with a given piece of software. As designers, this is the most direct way to use an LLM with what you already know how to use. In a lot of cases this use can go both ways. For instance, for this site I built a design system in a project file, then I made a wireframe in Figma, connected it with an MCP, told the coding agent to apply the design system to this wireframe, make it both live in code and editable in Figma, and went back and forth in adjusting each. One major issue with this setup is each task is complex for the LLM to implement, which both costs tokens and fills chat context. Also, all of these software companies recognise they are in direct competition with LLMs, for reasons I'll explain soon, and would rather you use their native *and often worse* AI tools; because of that, they have no incentive to make it easier for the tools to communicate.
  
  **Text:** MCP (Model Context Protocol): tools that let an LLM work directly inside other software. / Often both ways. / *(accent)* Each task is heavy: it costs tokens and fills the context.

  **Visual:** Figma, the agent and the live page as three framed panes, wired in two lanes: the prompt and Figma → Agent → code on beat 1; on beat 2 the page's headline grows and the change runs back code → Agent → Figma.
  
  **TODO:** *custom graphic: Figma ↔ Agent ↔ live code back-and-forth (no screenshots)*

## 7. Make Your Own Tools

- **Spoken:** The reason Adobe, Figma, and any other paid creative applications are rightfully concerned with increasing AI capability is because it is now fairly simple to create tools that allow you to replicate, and occasionally improve upon, the same functionalities as these applications for the cost of the tokens required to build it.

  To be clear, I don't find recent attempts to literally replicate all of Photoshop or any robust application to be particularly successful. Instead, it is remarkably easy to replicate and expand upon specific workflows within these individual programs as standalone tools which the LLM can both easily interact with and add additional functionality to.

  Do you want to make an editable filter that turns a black and white illustration into a 3d holographic illustration? Go for it. Do you want to control how buttons melt when a user clicks on them? Go for it. Do you want to control the shadows cast by text on an interface that is pitch black except where the cursor is? Go for it.

  **Text:** 
  In certain cases, desired visual outcomes can't be achieved with any existing tool. It is increasingly possible to generate your own tools. This presentation used many personally conceived tools.
  
  Test these tools out at the [link: playground]
  
  **Visual:** none

  **TODO:** *example link (new tab): graphics playground*

## 8. Conclusion

- **Spoken:** So, hopefully you have an idea of what is now possible. As you can imagine, we're in very uncharted territory, and there's a good chance everything *technical* we've gone through will be very different in a few months. I originally was going to spend 10 minutes talking about how to use Claude Code in the command line but frankly that isn't really necessary anymore. But what will *always* matter are your ideas, what you want to make and how you think it should function. Consider this: When Shakespeare was working, generously speaking, 40% of people could read and write in Europe. Now 99% of people can do both, and the general consensus is still that he was *The Best Writer*. My point is capability is not what matters. You could be the best technical illustrator in the world, and still make absolute dog shit. Your ability to create something meaningful is all that matters.

  Now if you want to see how this was really set up, I've provided this website's repo for download. Feel free to poke around.

  **Text:** 
  The design world is changing. Much of what I presented will change, likely soon. Some think this means we lose creative control or we will give up our ability to think. Many people who use these tools promote a, frankly, ugly vision of the future.
  
  But if you have vision, curiosity, and adaptability, this doesn't have to be true. 

  **Visual:** none
  
  - **Text:** 
    Thank you for listening.
    
    See how this presentation was made below.
    
    **TO-DO:** Button for downloadable .zip of repo
