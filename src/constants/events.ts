export interface Event {
  id: string;
  name: string;
  type: 'offline' | 'online';
  category: string;
  description: string;
  rules: string[];
  winners: string | number;
  price: number;
  date?: string;
  deadline?: string;
  link?: string;
  isTeam?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  headName?: string;
  headPhone?: string;
}

export const EVENTS: Event[] = [
  {
    id: 'green-mind-battle',
    name: 'Green Mind Battle (Quiz)',
    type: 'offline',
    category: 'Quiz',
    description: 'Sharpen your wits and brace yourself for a clash of eco-intellects! Green Mind Battle is where knowledge meets excitement as you race through riddles, rapid-fire rounds, and mind-twisting environmental trivia. Only the sharpest minds survive—will yours emerge victorious?',
    rules: [
      'Solo Event Only – Each participant must compete individually.',
      'Strictly no discussing or sharing answers with anyone.',
      'The quiz will be conducted on the Kahoot app.',
      'Any genuine network issues will be addressed by the coordinators.',
      'Participants with the highest score in the shortest time will qualify for the final round.'
    ],
    winners: 3,
    price: 50,
    isTeam: false,
    headName: 'Dr. Aryan Sharma',
    headPhone: '+91 98765 43210'
  },
  {
    id: 'mindscape-17',
    name: 'Mindscape 17 (Memory Challenge)',
    type: 'offline',
    category: 'Memory',
    description: 'A battle of memory and mindfulness! Participants will get a 2-minute glimpse of 17 sustainability principles displayed in a random sequence—and then the real challenge begins. Can you rearrange them in the perfect order under pressure? Test your focus, speed, and sharp recall in this thrilling sustainability memory quest.',
    rules: [
      'Observe 17 sustainability rules shown randomly and remember their numbers.',
      'You will get 2 minutes to memorize them, then write them with correct numbering.',
      'Top 5 most accurate participants will advance to the finals.',
      'No phones, no talking, no cheating, and no misbehavior allowed.'
    ],
    winners: 3,
    price: 50,
    isTeam: false,
    headName: 'Ms. Priya Verma',
    headPhone: '+91 98765 43211'
  },
  {
    id: 'elemental-sharks',
    name: 'Elemental Sharks (Shark Tank)',
    type: 'offline',
    category: 'Pitching',
    description: 'Step into the platform of intellectual discourse! This debate event challenges participants to present compelling perspectives on pressing chemistry-related issues, fostering critical thinking, effective communication, and teamwork.',
    rules: [
      'Team Composition: Teams can consist of 1 to 3 members.',
      'Idea: Each team submits one original idea related to Panchatatva / General chemistry / Sustainability.',
      'Pitching: Teams have 5-8 minutes to pitch their idea. Presentation may highlight innovation aspects and be supported with prototypes, digital presentations, or other creative methods.',
      'Originality: Using existing or copied is strictly prohibited.',
      'Disqualification: Failure to follow may result in disqualification.'
    ],
    winners: '2 Groups',
    price: 150,
    isTeam: true,
    minTeamSize: 1,
    maxTeamSize: 3,
    headName: 'Dr. Vikram Seth',
    headPhone: '+91 98765 43212'
  },
  {
    id: 'tatva-trail',
    name: 'Tatva Trail (Minute to Win It)',
    type: 'offline',
    category: 'Games',
    description: 'A high-energy, fast-paced team challenge inspired by the Panchatatva — Earth, Water, Fire, Air & Space. Teams of 5 members will compete in a series of one-minute elemental tasks, each representing a different natural element. Quick thinking, perfect coordination, and teamwork are the keys to surviving every element and conquering the trail.',
    rules: [
      'Teams of 5 must complete their tasks one after another in the given sequence.',
      'The fastest 5 teams to finish all tasks will qualify for the finals.',
      'No misbehavior or malpractice is allowed, any violation will lead to disqualification.',
      'All tasks must be performed exactly as instructed by the coordinators.'
    ],
    winners: '2 Groups',
    price: 250,
    isTeam: true,
    minTeamSize: 5,
    maxTeamSize: 5,
    headName: 'Prof. Neha Gupta',
    headPhone: '+91 98765 43213'
  },
  {
    id: 'eco-forensics',
    name: 'Eco-forensics',
    type: 'offline',
    category: 'Investigation',
    description: 'Step into the shoes of an environmental detective! Participants will be given a thrilling eco-crime case study filled with testing clues and evidence. Analyze the data, uncover the environmental violations, propose sustainable solutions, and ultimately identify the real culprit. Think smart, think green—only the sharpest minds will crack the case.',
    rules: [
      'Team Setup: The event allows individual participation or teams of up to 3 members.',
      'Case Content: Each team will receive an eco-forensic case with chemical evidence, environmental impact, and Panchatatva imbalance.',
      'Task: Analyze the evidence, identify the root cause, and propose sustainable, science-based solutions aligned with Panchatatva and chemistry core principles.'
    ],
    winners: '2 Group',
    price: 150,
    isTeam: true,
    minTeamSize: 1,
    maxTeamSize: 3,
    headName: 'Dr. Sameer Khan',
    headPhone: '+91 98765 43214'
  },
  {
    id: 'srishti-rahasya',
    name: 'Srishti Rahasya (Treasure Hunt)',
    type: 'offline',
    category: 'Adventure',
    description: 'Dive into an adventurous quest where every clue uncovers a secret of the natural world. Navigate hidden trails, crack environmental riddles, and piece together mysteries waiting to be solved. In Srishti Rahasya, curiosity is your compass—only the keenest explorers find the treasure!',
    rules: [
      'Top 10 teams clearing the screening round will be onboard for the final round.',
      'Participants must form groups of 5.',
      'Any group found engaging in unfair practices or misconduct will be disqualified immediately.'
    ],
    winners: '2 Group',
    price: 250,
    isTeam: true,
    minTeamSize: 5,
    maxTeamSize: 5,
    headName: 'Mr. Rohan Das',
    headPhone: '+91 98765 43215'
  },
  {
    id: 'atomic-shuffle',
    name: 'Atomic Shuffle',
    type: 'offline',
    category: 'Activity',
    description: 'Atomic shuffle is a lively and educational game that blends music, movement, and chemistry knowledge to create a fun and competitive environment. Participants test their understanding of the periodic table while enjoying the thrill of dancing and quick thinking. This activity is perfect for engaging groups in an enjoyable learning experience that promotes teamwork and chemistry awareness.',
    rules: [
      'Gameplay: Participants dance or move while the music plays. When the music stops, the host will announce an element, and players must quickly form groups equal to its atomic number.',
      'Players who fail to form the correct group or are left out will be eliminated.',
      'Fair Play: No pushing or rough behavior & the host’s decisions are final.',
      'Winning: The game continues until the winners are determined.',
      'Participants: 30–40 players will participate in batches.'
    ],
    winners: 3,
    price: 30,
    isTeam: false,
    headName: 'Dr. Anjali Rao',
    headPhone: '+91 98765 43216'
  },
  {
    id: 'kismat-housie',
    name: 'Kismat (Housie)',
    type: 'offline',
    category: 'Luck',
    description: 'A Panchatatva-inspired chemistry housie where each called atomic number represents the balance of Earth, Water, Fire, Air, and Space. Mark the elements, follow the flow of the five tatvas, and let your kismat decide if you claim victory first!',
    rules: [
      'The game will follow standard housie rules.'
    ],
    winners: 'Varies',
    price: 20,
    isTeam: false,
    headName: 'Prof. Rajesh Iyer',
    headPhone: '+91 98765 43217'
  },
  {
    id: 'doodleium',
    name: 'Doodleium (Doodling)',
    type: 'online',
    category: 'Art',
    description: 'Unleash your imagination as you doodle across the vast expanse of creativity, where atoms, molecules, and cosmic elements collide. DOODLEIUM invites you to illustrate the building blocks of the universe-from electron orbits to nebula-like reactions transforming chemical concepts into vibrant visual art. Let your pen mimic the motion of particles and craft doodles that resonate with the chemistry of the cosmos.',
    rules: [
      'No screening round.',
      'Doodling can be either - Digital or Handmade.',
      'Related to the theme: Panchatatva / General chemistry / Sustainability.',
      'Submission Date: 15 December 2026, 12:00 pm.',
      'Be creative with your doodles!',
      'Show some chemistry love in your art.',
      'Make it visually appealing and theme rich.'
    ],
    deadline: '15 December 2026',
    winners: 3,
    price: 40,
    isTeam: false,
    headName: 'Ms. Kavita Singh',
    headPhone: '+91 98765 43218'
  },
  {
    id: 'eco-vision',
    name: 'Eco-vision (Photography)',
    type: 'online',
    category: 'Photography',
    description: 'Capture the chemistry of nature through your lens! Eco-Vision celebrates the molecular magic hidden in the environment—diffusion of colors in leaves, refraction in water droplets, oxidation in rocks, or polymer patterns in plant fibers. Every photograph becomes a snapshot of a chemical process in motion. Showcase how the natural world is a living laboratory filled with reactions, elements, and energy transformations.',
    rules: [
      'No screening round',
      'Submission date : 15 December 2026 ,12:00pm',
      'Participants must submit a high-resolution photograph related to the theme.',
      'Photographs must adhere to the theme: Green chemistry / Sustainable chemistry / General Chemistry',
      'A detailed description explaining the photograph\'s relevance to the theme is mandatory.'
    ],
    deadline: '15 December 2026',
    winners: 3,
    price: 40,
    isTeam: false,
    headName: 'Mr. Amit Trivedi',
    headPhone: '+91 98765 43219'
  },
  {
    id: 'reel-iemental',
    name: 'Reel-iemental (Reels)',
    type: 'online',
    category: 'Content Creation',
    description: 'Lights, camera, reaction! Reel-iemental invites you to craft short creative reels inspired by chemical phenomena-from colorful titrations and combustion reactions to molecular structures and elemental bonds. Blend creativity with chemistry to showcase the dynamic world of reactions, periodic trends, lab aesthetics, or even chemistry humor. Your reel should capture the energy, spontaneity, and transformation that define chemical science.',
    rules: [
      'Reels must relate to Panchatatva (the five elements), General Chemistry, or Sustainability/Environmental topics.',
      'Duration: Each reel should be 10-30 seconds long.',
      'Content: Reels should be creative, visually appealing, and scientifically meaningful. Storytelling and humour are encouraged, but content must remain respectful and non-offensive.',
      'Originality: Entries must be original. No plagiarism, copied clips, or unedited AI-generated content.',
      'Editing & Tools: Templates, audio, or editing tools may be used, but the idea and execution must be your own',
      'Submission Date: December 15, 2026, 12:00 AM'
    ],
    deadline: '15 December 2026',
    winners: 3,
    price: 40,
    isTeam: false,
    headName: 'Ms. Sneha Patil',
    headPhone: '+91 98765 43220'
  },
  {
    id: 'labellab',
    name: 'Labellab (Label Designing)',
    type: 'online',
    category: 'Design',
    description: 'Get ready to blend science with creativity! Labelab is an exciting label-designing competition where students create innovative, eye-catching, and scientifically accurate labels for chemical products. Show your artistic skills while communicating important information like safety symbols, compositions, and chemical details clearly. Whether it’s a lab chemical, cosmetic, or eco-friendly product, design a label that makes science safe and stylish!',
    rules: [
      'Submission Date: 15 December 2026, 12:00 pm.',
      'Chemicals to Choose From: Conc. H2SO4, Conc. HNO3, Conc. HCl, Dil. NaOH, Bromine Water, Potassium Ferrocyanide, Potassium Ferricyanide, Potassium Dichromate, Sodium Nitrite, Ammonium Hydroxide, Phenolphthalein, Methyl Orange. Pick One chemical from the given list.',
      'Add its name and correct chemical formula clearly.',
      'Design must reflect the theme of the event.',
      'You may include basic MSDS details (optional but appreciated).',
      'Colour scheme - White background + Black text',
      'Final label size should be 4 × 8 inches',
      'Ensure your design is neat, original, and suitable to be used on our actual laboratory chemical bottles.'
    ],
    deadline: '15 December 2026',
    winners: 3,
    price: 40,
    isTeam: false,
    headName: 'Dr. Manish Pandey',
    headPhone: '+91 98765 43221'
  },
  {
    id: 'sustain-a-meme',
    name: 'Sustain-a-meme (Memes making)',
    type: 'online',
    category: 'Humor',
    description: 'Combine humor with high-energy reactions! Sustain-a-Meme challenges participants to create memes that highlight chemical sustainability-renewable energy, green chemistry principles, biodegradable polymers, atmospheric chemistry, and more. Use wit to explain scientific ideas, expose sustainability issues.',
    rules: [
      'Your meme must be related to Panchatatva (the five elements), General Chemistry, or Sustainability/Environmental topics.',
      'Humour is encouraged but it should remain respectful, clean, and non-offensive.',
      'The meme should be accurate, creative, and meaningfully presented.',
      'All entries must be original no plagiarism or unedited AI-generated content is permitted.',
      'Using meme templates is allowed, but the captions and ideas must be your own.',
      'Submission Date: December 15, 2026, 12:00 AM'
    ],
    deadline: '15 December 2026',
    winners: 3,
    price: 20,
    isTeam: false,
    headName: 'Prof. Geeta Joshi',
    headPhone: '+91 98765 43222'
  }
];
