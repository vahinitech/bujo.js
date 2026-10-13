/**
 * The words printed in the ready-made editions, kept apart from the page
 * order in editions.js so they can be read and edited in one place.
 *
 * Rules for this copy: plain words a child or a busy professional reads
 * at a glance, one idea per sentence, and nothing a page cannot keep: no
 * health, safety or legal advice beyond what any school or family says.
 */

const KIDS_HOW_TO_USE = [
    'Practise for about ten minutes a day. A short session every day does more than a long one once a week.',
    'Sit up straight with both feet flat on the floor, and tilt the page a little.',
    'Hold the pencil lightly, a little way up from the point. A tight grip makes the hand tired.',
    'Write slowly. Small letters fill the shaded band and sit on the third line. Tall letters reach the top line, and tails go down to the bottom line.',
    'Between the practice pages you will find experiments, ideas, clever tricks and pictures to paint. Each one asks you to write a little, so it counts as practice too.',
    'After each practice, tick a box on the practice tracker.',
    'Once a week, look back at your first pages, and write the letters that got better in "Letters I improved".'
];

const IF_I_AM_LOST = [
    'Stop and stay in one safe place.',
    'Ask a police officer, a shopkeeper or a mother with children for help.',
    'Tell them your name and a parent\'s phone number.',
    'Never go anywhere with someone you do not know.'
];

const EXPERIMENTS = {
    float: {
        title: 'Float or Sink?',
        question: 'Which things float on water, and which sink?',
        need: ['a bucket or big bowl of water', 'a leaf', 'a coin', 'a pencil', 'a plastic bottle cap', 'a small stone'],
        steps: [
            'Before you start, guess: float or sink? Write your guesses below.',
            'Put the things in the water one at a time.',
            'Watch each one. Does it stay on top or go down?',
            'Take everything out and dry your hands.'
        ]
    },
    shadow: {
        title: 'My Shadow',
        question: 'Does my shadow change during the day?',
        need: ['a sunny place', 'a piece of chalk', 'a grown-up to help'],
        steps: [
            'Stand on one spot in the morning. Ask a grown-up to mark the end of your shadow with chalk.',
            'Stand on the same spot at lunch time and again in the evening.',
            'Each time, mark the shadow and count how many footsteps long it is.',
            'Never look straight at the sun.'
        ]
    },
    seeds: {
        title: 'Growing Seeds',
        question: 'What does a seed need to start growing?',
        need: ['two cups', 'cotton wool', 'water', 'a few green gram (moong) seeds'],
        steps: [
            'Put cotton in both cups and a few seeds on top.',
            'Wet the cotton in one cup. Leave the other cup dry.',
            'Keep both cups near a window.',
            'Look every day for five days and write what you see.'
        ]
    },
    rainbow: {
        title: 'Make a Rainbow',
        question: 'Can sunlight and water make a rainbow?',
        need: ['a clear glass of water', 'a sunny window', 'a sheet of white paper'],
        steps: [
            'Put the glass of water on a sunny window sill.',
            'Put the white paper on the floor below it.',
            'Move the paper slowly until you see colours.',
            'Count the colours and write their names.'
        ]
    }
};

const IDEA_CHALLENGES = [
    'How could a school bag be lighter?',
    'How could we save water at home?',
    'How could we stop pencils rolling off the desk?'
];

const TRICKS = [
    [
        {
            title: 'Which months have 31 days?',
            text: 'Make a fist. Say the months on the bumps of your knuckles and the dips between them, starting with January on the first knuckle. Knuckle months have 31 days. Dip months have 30, except February. After July on the last knuckle, start again on the first knuckle with August.'
        },
        {
            title: 'The nine times table on your fingers',
            text: 'Hold up ten fingers. For 9 times 4, fold down the fourth finger from the left. Count the fingers on the left of it (3) and on the right (6). The answer is 36.'
        },
        {
            title: 'Left or right?',
            text: 'Hold both hands up with your palms facing away from you and your thumbs out. The hand whose thumb and first finger make the letter L is your left hand.'
        }
    ],
    [
        {
            title: 'Find the directions',
            text: 'The sun rises in the east. In the morning, stand facing the sun: east is in front of you, west is behind you, north is on your left and south is on your right.'
        },
        {
            title: 'Measure with your hand',
            text: 'Spread your hand wide. The distance from your thumb tip to your little finger tip is your hand span. Measure it once with a ruler, then use it to measure a table or a book.'
        },
        {
            title: 'Ready for school',
            text: 'Pack your school bag the night before. Read the timetable, put in the books for each class, and keep the bag by the door.'
        }
    ]
];

const DRAWING_PROMPTS = {
    window: 'Paint the view from your window. What can you see?',
    bheema: 'Draw a new friend for Bheema the elephant. Give your friend a name.',
    machine: 'Invent a machine that does a job you do not like. Draw it and show how it works.',
    family: 'Draw your family doing something together.'
};

const TEACHER_HOW_TO_USE = [
    'Write your class list on the first attendance page. Copy it in the same order onto the other attendance and marks pages, so each child keeps the same row everywhere.',
    'Plan each week on a lesson plan page before Monday, and tick each lesson when it is done.',
    'Write the name of each test or activity at the top of a marks column, with the maximum marks in the row below it.',
    'Keep a few lines on every child: what they do well, where they need help and the next step. Short notes made often are more useful than long ones at the end of term.',
    'Note each meeting with a parent and what you agreed to try.',
    'At the end of the term, read your notes and write what worked on the last page.'
];

const ADVOCATE_HOW_TO_USE = [
    'Give each matter a line in the case index, with the diary pages where its notes are.',
    'Write each day\'s matters on the hearings pages: court and hall, case number, parties, the stage reached and the next date.',
    'Keep one case note page per matter: the facts, the points to argue, the documents and pages to cite, and what must be done before the next date.',
    'Copy every next date into the year at a glance, so no date is missed.',
    'Note client meetings and the follow-up you promised.'
];

export {
    KIDS_HOW_TO_USE,
    IF_I_AM_LOST,
    EXPERIMENTS,
    IDEA_CHALLENGES,
    TRICKS,
    DRAWING_PROMPTS,
    TEACHER_HOW_TO_USE,
    ADVOCATE_HOW_TO_USE
};
