import { VideoMetadata } from '../src/types/tutor';

export const CURATED_LIBRARY: VideoMetadata[] = [
  {
    id: 'WUvTyaaNkzM',
    url: 'https://www.youtube.com/watch?v=WUvTyaaNkzM',
    title: 'The Essence of Calculus, Chapter 1',
    channel: '3Blue1Brown',
    channelUrl: 'https://www.youtube.com/@3blue1brown',
    duration: 1025,
    thumbnail: 'https://i.ytimg.com/vi/WUvTyaaNkzM/maxresdefault.jpg',
    description: 'What is calculus? Intuition behind derivatives and integrals through the geometry of circles, parabola area, and car velocity.',
    chapters: [
      {
        id: 'ch-calc-1',
        chapterNumber: 1,
        startTime: 0,
        endTime: 85,
        title: 'Slicing a Circle into Concentric Rings (0:00 - 1:25)',
        summary: 'Breaking a circle of radius R into thin concentric rings of radius r and thickness dr.',
        blackboardContent: 'Circle with radius R. Sliced into concentric yellow/blue rings at radius r with microscopic thickness dr. When snipped and straightened, each ring forms a thin rectangular strip of width equal to circumference 2πr and height dr. Strip Area dA = 2πr · dr.',
        equations: ['A = \\pi R^2', 'dA = 2\\pi r \\, dr', '\\text{Circumference} = 2\\pi r', '\\text{Thickness} = dr'],
        keyConcepts: ['Concentric Rings', 'Differential Area dA = 2πr dr', 'Geometric Slicing']
      },
      {
        id: 'ch-calc-2',
        chapterNumber: 2,
        startTime: 86,
        endTime: 144,
        title: 'Unrolling Rings into a Right Triangle (1:26 - 2:24)',
        summary: 'Stacking all unrolled strips from r=0 to r=R creates a right triangle of base R and height 2πR.',
        blackboardContent: 'All concentric ring strips unrolled and stacked side-by-side along the horizontal axis. Horizontal Base = R, Vertical Height = 2πR. The area under the resulting diagonal line is 1/2 · Base · Height = 1/2 · R · 2πR = πR². Continuous accumulation ∫ 2πr dr = πR².',
        equations: ['\\text{Base} = R', '\\text{Height} = 2\\pi R', '\\text{Area} = \\frac{1}{2}(R)(2\\pi R) = \\pi R^2', '\\int_0^R 2\\pi r \\, dr = \\pi R^2'],
        keyConcepts: ['Right Triangle Construction', 'Integration as Stacking Strips', 'Exact Area πR²']
      },
      {
        id: 'ch-calc-3',
        chapterNumber: 3,
        startTime: 145,
        endTime: 270,
        title: 'Area Under Parabola y = x² & Differential Strip dA (2:25 - 4:30)',
        summary: 'Finding the area under y = x² from 0 to x. Nudging x by dx adds a vertical strip of height x² and width dx.',
        blackboardContent: 'Coordinate graph of parabola y = x² shaded from 0 to x. Step forward by tiny dx: new area added is a thin vertical rectangle of height x² and width dx, so dA = x² dx. Dividing by dx gives the rate of area change: dA/dx = x².',
        equations: ['y = x^2', 'dA = x^2 \\, dx', '\\frac{dA}{dx} = x^2', 'A(x) = \\int_0^x t^2 \\, dt'],
        keyConcepts: ['Parabola y = x²', 'Differential Strip dA = x² dx', 'Rate of Area Change dA/dx = x²']
      },
      {
        id: 'ch-calc-4',
        chapterNumber: 4,
        startTime: 271,
        endTime: 480,
        title: 'Finding the Antiderivative Area Function A(x) = (1/3)x³ (4:31 - 8:00)',
        summary: 'Reversing differentiation to find that A(x) = (1/3)x³ because its derivative is x².',
        blackboardContent: 'To find the area function A(x), we ask: what function has derivative equal to x²? Since d/dx[(1/3)x³] = x², the cumulative area under y = x² from 0 to x is exactly A(x) = (1/3)x³. Higher order infinitesimals dx² vanish in the limit as dx approaches 0.',
        equations: ['\\frac{d}{dx}\\left(\\frac{1}{3}x^3\\right) = x^2', 'A(x) = \\frac{1}{3}x^3', '\\lim_{dx \\to 0} (dx)^2 = 0'],
        keyConcepts: ['Antiderivative', 'Area Function (1/3)x³', 'Negligible Higher-Order Infinitesimals']
      },
      {
        id: 'ch-calc-5',
        chapterNumber: 5,
        startTime: 481,
        endTime: 650,
        title: 'Car Motion: Position s(t) = t³ & Average vs Instantaneous Speed (8:01 - 10:50)',
        summary: 'A car traveling with distance function s(t) = t³. Difference quotient Δs/Δt as time interval shrinks.',
        blackboardContent: 'Car traveling along road with position s(t) = t³. Speedometer measures instantaneous speed ds/dt at time t. If time advances by dt, distance changes by ds = s(t+dt) - s(t). Average speed over dt is [s(t+dt) - s(t)] / dt.',
        equations: ['s(t) = t^3', '\\text{Average Speed} = \\frac{\\Delta s}{\\Delta t} = \\frac{s(t+\\Delta t) - s(t)}{\\Delta t}', 'v(t) = \\lim_{\\Delta t \\to 0} \\frac{\\Delta s}{\\Delta t}'],
        keyConcepts: ['Position s(t) = t³', 'Difference Quotient', 'Instantaneous Speedometer Velocity']
      },
      {
        id: 'ch-calc-6',
        chapterNumber: 6,
        startTime: 651,
        endTime: 840,
        title: 'Power Rule Derivation: v(t) = ds/dt = 3t² (10:51 - 14:00)',
        summary: 'Expanding (t+dt)³ = t³ + 3t² dt + 3t(dt)² + (dt)³. Dividing by dt yields instantaneous velocity v(t) = 3t².',
        blackboardContent: 'Algebraic expansion: s(t+dt) = (t+dt)³ = t³ + 3t² dt + 3t(dt)² + dt³. Subtracting initial position s(t) leaves ds = 3t² dt + 3t(dt)² + dt³. Dividing by dt gives ds/dt = 3t² + 3t(dt) + dt² -> 3t² as dt -> 0. At t = 2s, velocity is v(2) = 3(2)² = 12 m/s.',
        equations: [
          's(t+dt) = (t+dt)^3 = t^3 + 3t^2 \\, dt + 3t(dt)^2 + dt^3',
          'ds = 3t^2 \\, dt + \\mathcal{O}(dt^2)',
          'v(t) = \\frac{ds}{dt} = 3t^2',
          'v(2) = 3(2)^2 = 12 \\text{ m/s}'
        ],
        keyConcepts: ['Binomial Expansion (t+dt)³', 'Power Rule (t³)\' = 3t²', 'Neglecting dt² and dt³ terms']
      },
      {
        id: 'ch-calc-7',
        chapterNumber: 7,
        startTime: 841,
        endTime: 1025,
        title: 'The Fundamental Theorem of Calculus: The Grand Inverse Duality (14:01 - 17:05)',
        summary: 'Derivatives (instantaneous rates) and Integrals (continuous accumulation) are inverse operations.',
        blackboardContent: 'Duality of calculus on split screen: Finding the area under a curve is the exact inverse of finding the slope/rate of change. Differentiating an accumulated integral recovers the original curve: d/dx[∫ f(t) dt] = f(x). Integration undoes differentiation: ∫ f\'(x) dx = f(b) - f(a).',
        equations: [
          '\\frac{d}{dx}\\left(\\int_0^x f(t) \\, dt\\right) = f(x)',
          '\\int_a^b f\'(x) \\, dx = f(b) - f(a)'
        ],
        keyConcepts: ['Fundamental Theorem of Calculus', 'Inverse Operations', 'Integration Undoes Differentiation']
      }
    ],
    transcript: [
      { start: 0, duration: 8, text: "It is an almost universal experience for students to be confused when they first encounter calculus." },
      { start: 8, duration: 12, text: "The mechanics of taking derivatives and computing integrals often obscure the simple geometric ideas at play." },
      { start: 20, duration: 15, text: "Consider finding the area of a circle with radius R. We all know the formula pi R squared." },
      { start: 35, duration: 20, text: "Why is it pi R squared? Where does that come from? Let us break the circle into concentric rings." },
      { start: 55, duration: 25, text: "Each ring has a radius r and a microscopic thickness dr. When we unroll this ring, it looks like a rectangle." },
      { start: 80, duration: 20, text: "The width is the circumference 2 pi r, and the height is dr. So the area dA is 2 pi r dr." },
      { start: 100, duration: 25, text: "Stacking all these unrolled strips from r=0 to r=R forms a right triangle with base R and height 2 pi R." },
      { start: 125, duration: 20, text: "Area of a triangle is half base times height: one half R times 2 pi R equals pi R squared." },
      { start: 145, duration: 30, text: "Now suppose we have the parabola y equals x squared, and we want the area underneath the curve from zero to x." },
      { start: 175, duration: 25, text: "If we increase x by a tiny amount dx, the area increases by a thin vertical strip of area dA equals x squared dx." },
      { start: 200, duration: 30, text: "Dividing both sides by dx, we get dA over dx equals x squared. The rate at which area grows is the height of the curve!" },
      { start: 230, duration: 35, text: "This is the Fundamental Theorem of Calculus: finding the area is equivalent to finding a function whose derivative is x squared." },
      { start: 265, duration: 30, text: "Since the derivative of x cubed over 3 is x squared, the cumulative area function A(x) must be one third x cubed." },
      { start: 295, duration: 35, text: "Notice how an otherwise difficult problem—finding the area of a curved shape—was solved by asking about its rate of change." },
      { start: 330, duration: 40, text: "Let us look closer at this curve y equals x squared. At any point x, the height of the graph is x squared." },
      { start: 370, duration: 35, text: "When we step forward by dx, the sliver of area is almost a perfect rectangle of height x squared and width dx." },
      { start: 405, duration: 40, text: "The tiny triangular top of the sliver has area on the order of dx squared, which vanishes compared to dx as dx approaches zero." },
      { start: 445, duration: 40, text: "This is the essence of derivatives: we ignore higher-order infinitesimals and focus purely on the linear first-order change." },
      { start: 485, duration: 45, text: "Now let us examine a completely different problem: measuring the speed of a car moving along a track." },
      { start: 530, duration: 40, text: "Suppose the distance traveled by the car after time t is given by s(t) equals t cubed." },
      { start: 570, duration: 45, text: "What does the speedometer show at time t equals 2? It shows the instantaneous speed ds over dt." },
      { start: 615, duration: 40, text: "To compute this, we ask: how far does the car move in a tiny time increment dt?" },
      { start: 655, duration: 45, text: "s(t plus dt) equals (t plus dt) cubed, which expands to t cubed plus 3 t squared dt plus 3 t dt squared plus dt cubed." },
      { start: 700, duration: 40, text: "Subtracting the starting distance s(t), the change in distance ds is 3 t squared dt plus negligible higher order terms." },
      { start: 740, duration: 40, text: "Dividing by dt gives the instantaneous velocity: ds over dt equals 3 t squared." },
      { start: 780, duration: 45, text: "At time t equals 2 seconds, the speed is 3 times 2 squared, which equals 12 meters per second." },
      { start: 825, duration: 45, text: "Notice the exact same pattern: taking a tiny step, computing the change, dividing by the step size, and letting the step shrink to zero." },
      { start: 870, duration: 45, text: "Derivatives measure sensitivity and rates of change. Integrals measure continuous accumulation." },
      { start: 915, duration: 50, text: "The Fundamental Theorem of Calculus bridges them together: differentiation undoes integration, and integration undoes differentiation." },
      { start: 965, duration: 60, text: "Whenever you have an accumulation of many small pieces, you can compute it by finding the antiderivative of the slice function." }
    ]
  },
  {
    id: 'aRDOq75yEwk',
    url: 'https://www.youtube.com/watch?v=aRDOq75yEwk',
    title: 'MIT 8.01: Friction on Inclined Planes & Free Body Diagrams',
    channel: 'Walter Lewin (MIT)',
    channelUrl: 'https://www.youtube.com/@MIT',
    duration: 1240,
    thumbnail: 'https://i.ytimg.com/vi/aRDOq75yEwk/hqdefault.jpg',
    description: 'Comprehensive lecture on resolving gravitational force vectors on a ramp, normal force, static friction, and kinetic friction.',
    chapters: [
      {
        id: 'ch-phys-1',
        chapterNumber: 1,
        startTime: 0,
        endTime: 90,
        title: 'Introduction to Inclined Planes & Setup (0:00 - 1:30)',
        summary: 'Setting up a block of mass m resting on a ramp inclined at angle θ with respect to horizontal.',
        blackboardContent: 'Chalk drawing of ramp inclined at angle θ. Wooden block of mass m on the ramp. Gravity force vector F_g = m g pointing straight downward toward Earth center.',
        equations: ['\\vec{F}_g = m\\vec{g}', '\\theta = \\text{incline angle}', 'm = \\text{mass of block}'],
        keyConcepts: ['Inclined Plane Geometry', 'True Gravity Vector mg', 'Ramp Angle θ']
      },
      {
        id: 'ch-phys-2',
        chapterNumber: 2,
        startTime: 91,
        endTime: 240,
        title: 'Vector Decomposition along Tilted Axes (1:31 - 4:00)',
        summary: 'Decomposing gravity into parallel (mg sin θ) downslope and perpendicular (mg cos θ) into ramp.',
        blackboardContent: 'Tilted coordinate frame: x-axis downslope parallel to ramp, y-axis perpendicular to ramp. Gravity decomposition: Parallel component W_parallel = mg sin θ (downslope), Perpendicular component W_perp = mg cos θ (into ramp). Normal force N balances W_perp: N = mg cos θ because ΣFy = 0.',
        equations: ['W_\\parallel = mg \\sin\\theta', 'W_\\perp = mg \\cos\\theta', 'N = mg \\cos\\theta', '\\sum F_y = N - mg \\cos\\theta = 0'],
        keyConcepts: ['Tilted Coordinate System', 'Normal Force N = mg cos θ', 'Perpendicular Equilibrium']
      },
      {
        id: 'ch-phys-3',
        chapterNumber: 3,
        startTime: 241,
        endTime: 510,
        title: 'Static Friction & Critical Slip Angle θ_c (4:01 - 8:30)',
        summary: 'Static friction fs ≤ μs N prevents sliding. Finding critical slip angle tan θ_c = μs.',
        blackboardContent: 'Static friction force fs points upslope, opposing the tendency to slide. As ramp angle θ increases, mg sin θ increases until it reaches maximum static friction fs,max = μs N = μs mg cos θ. At critical angle θ_c: mg sin θ_c = μs mg cos θ_c ==> tan θ_c = μs. Mass m cancels out!',
        equations: ['f_s \\le \\mu_s N', 'f_{s,\\max} = \\mu_s mg \\cos\\theta', 'mg \\sin\\theta_c = \\mu_s mg \\cos\\theta_c', '\\tan\\theta_c = \\mu_s'],
        keyConcepts: ['Static Friction Threshold', 'Critical Angle tan θ_c = μs', 'Mass Independence']
      },
      {
        id: 'ch-phys-4',
        chapterNumber: 4,
        startTime: 511,
        endTime: 840,
        title: 'Kinetic Friction & Downslope Acceleration (8:31 - 14:00)',
        summary: 'Once sliding begins, kinetic friction fk = μk N opposes motion. Deriving acceleration a = g(sin θ - μk cos θ).',
        blackboardContent: 'Block sliding down ramp: kinetic friction fk = μk N = μk mg cos θ acts upslope. Newton second law along incline: ΣFx = mg sin θ - fk = m a ==> mg sin θ - μk mg cos θ = m a ==> a = g(sin θ - μk cos θ). Since μk < μs, the block accelerates down the plane once slip starts.',
        equations: ['f_k = \\mu_k N = \\mu_k mg \\cos\\theta', '\\sum F_x = mg \\sin\\theta - f_k = ma', 'a = g(\\sin\\theta - \\mu_k \\cos\\theta)'],
        keyConcepts: ['Kinetic Friction fk = μk N', 'Downslope Acceleration a = g(sin θ - μk cos θ)', 'μk < μs']
      },
      {
        id: 'ch-phys-5',
        chapterNumber: 5,
        startTime: 841,
        endTime: 1240,
        title: 'Classroom Demonstration: Measuring μs & μk with Friction Table (14:01 - 20:40)',
        summary: 'Walter Lewin tests wood, sandpaper, and teflon on the variable ramp angle meter.',
        blackboardContent: 'Classroom experimental table on board: Wood on wood (μs ≈ 0.38, θ_c ≈ 21°), Sandpaper on wood (μs ≈ 0.70, θ_c ≈ 35°), Teflon on steel (μs ≈ 0.04, θ_c ≈ 2.3°). Demonstrating that friction is independent of surface contact area.',
        equations: ['\\mu_s = \\tan\\theta_c', 'f_k < f_s'],
        keyConcepts: ['Empirical Measurement of μs', 'Area Independence of Friction']
      }
    ],
    transcript: [
      { start: 0, duration: 15, text: "Today we are going to master one of the most fundamental problems in classical mechanics: friction on an inclined plane." },
      { start: 15, duration: 25, text: "Look at the blackboard. We have a block of mass m resting on a ramp inclined at an angle theta with respect to the horizontal." },
      { start: 40, duration: 30, text: "The force of gravity m g points straight down toward the center of the Earth. But motion can only occur along the ramp." },
      { start: 70, duration: 35, text: "Therefore, we choose a coordinate system tilted with the ramp: x along the incline downslope, and y perpendicular to the incline." },
      { start: 105, duration: 35, text: "The component of gravity pulling the block down the ramp is m g sine theta. The component pressing the block into the ramp is m g cosine theta." },
      { start: 140, duration: 35, text: "Because the block does not accelerate in the y direction, the normal force N must exactly balance m g cosine theta: N equals m g cosine theta." },
      { start: 175, duration: 35, text: "Now, why doesn't the block slide immediately? Because of static friction f_s pointing upslope, which prevents motion." },
      { start: 210, duration: 40, text: "Static friction is an adjustable force. It is only as large as it needs to be to prevent motion, up to a maximum of mu_s times N." },
      { start: 250, duration: 45, text: "If we slowly raise the ramp, theta increases. m g sine theta increases, while the normal force and f_s max decrease." },
      { start: 295, duration: 45, text: "At the critical angle theta_c, the downslope gravity component matches the maximum static friction: m g sine theta equals mu_s m g cosine theta." },
      { start: 340, duration: 40, text: "Notice that mass m cancels out completely! Tangent of theta_c equals mu_s. This gives us an elegant way to measure the static friction coefficient." },
      { start: 380, duration: 45, text: "Now, what happens once the block starts sliding? The friction drops to kinetic friction f_k equals mu_k times N." },
      { start: 425, duration: 45, text: "Because mu_k is strictly less than mu_s, the net force suddenly becomes positive, and the block accelerates down the ramp." },
      { start: 470, duration: 50, text: "By Newton's second law, m g sine theta minus mu_k m g cosine theta equals m times acceleration a." },
      { start: 520, duration: 50, text: "Dividing by m, we find the acceleration a equals g times (sine theta minus mu_k cosine theta)." }
    ]
  },
  {
    id: 'nxebQZUVvTg',
    url: 'https://www.youtube.com/watch?v=nxebQZUVvTg',
    title: 'VSEPR Theory & Why Water is Bent',
    channel: 'Tyler DeWitt',
    channelUrl: 'https://www.youtube.com/@TylerDeWitt',
    duration: 890,
    thumbnail: 'https://i.ytimg.com/vi/nxebQZUVvTg/hqdefault.jpg',
    description: 'Understanding electron pair repulsion, lone pairs vs bonding pairs, and why water forms a bent 104.5 degree molecular geometry.',
    chapters: [
      {
        id: 'ch-chem-1',
        chapterNumber: 1,
        startTime: 0,
        endTime: 180,
        title: 'Lewis Structure of Water H2O (0:00 - 3:00)',
        summary: 'Oxygen center with 2 single bonds to H and 2 non-bonding lone pairs. Steric number = 4.',
        blackboardContent: 'Lewis electron dot structure of H2O. Central Oxygen atom with 6 valence electrons, each Hydrogen contributing 1 electron. Total = 8 valence electrons. 2 bonding pairs (O-H single bonds) and 2 non-bonding lone pairs on Oxygen. Steric number = 2 + 2 = 4 (tetrahedral electron domain geometry).',
        equations: ['\\text{Steric Number} = \\text{Bonded Atoms} + \\text{Lone Pairs} = 2 + 2 = 4', '\\text{Electron Geometry: Tetrahedral}'],
        keyConcepts: ['Lewis Structure', 'Steric Number = 4', 'Tetrahedral Electron Domain Geometry']
      },
      {
        id: 'ch-chem-2',
        chapterNumber: 2,
        startTime: 181,
        endTime: 450,
        title: 'Lone Pair Repulsion & Bond Angle Compression to 104.5° (3:01 - 7:30)',
        summary: 'Lone pairs occupy more spatial volume than bonded pairs, squeezing the H-O-H angle from 109.5° down to 104.5°.',
        blackboardContent: 'VSEPR repulsion hierarchy on whiteboard: Lone Pair - Lone Pair > Lone Pair - Bonding Pair > Bonding Pair - Bonding Pair. The two lone pairs spread out and exert extra electrostatic repulsion, squeezing the H-O-H bond angle from the ideal tetrahedral 109.5° down to 104.5° (Bent molecular shape).',
        equations: ['\\angle \\text{H-O-H} = 104.5^\\circ \\quad (\\text{compressed from ideal } 109.5^\\circ)', '\\text{Repulsion: LP-LP} > \\text{LP-BP} > \\text{BP-BP}'],
        keyConcepts: ['VSEPR Repulsion Hierarchy', 'Bond Angle Compression', 'Bent Molecular Shape']
      },
      {
        id: 'ch-chem-3',
        chapterNumber: 3,
        startTime: 451,
        endTime: 890,
        title: 'Net Molecular Dipole & Polarity of Water (7:31 - 14:50)',
        summary: 'Because water is bent rather than linear, individual O-H bond dipoles add constructively rather than canceling.',
        blackboardContent: 'Electronegativity comparison: Oxygen (3.44) is far more electronegative than Hydrogen (2.20). Each O-H bond has a dipole vector pointing toward Oxygen (δ-). Because the molecule is bent at 104.5°, the horizontal dipole components cancel while vertical components add constructively, producing a strong net dipole vector μ_net.',
        equations: ['\\vec{\\mu}_{\\text{net}} = \\sum \\vec{\\mu}_{\\text{bond}} \\ne 0', '\\Delta \\text{EN} = 3.44 - 2.20 = 1.24'],
        keyConcepts: ['Dipole Moment', 'Vector Addition of Bond Dipoles', 'Polarity of Water']
      }
    ],
    transcript: [
      { start: 0, duration: 15, text: "Why is water bent? Why isn't H2O a straight line like CO2? Today we will use VSEPR theory to understand this." },
      { start: 15, duration: 25, text: "First, let us draw the Lewis structure on the board. Oxygen is in Group 6, so it brings 6 valence electrons. Each Hydrogen brings 1." },
      { start: 40, duration: 30, text: "That gives a total of 8 valence electrons. Oxygen shares a pair with each Hydrogen, leaving 4 non-bonding electrons as 2 lone pairs." },
      { start: 70, duration: 35, text: "Counting electron domains around Oxygen: 2 single bonds plus 2 lone pairs gives a steric number of 4." },
      { start: 105, duration: 35, text: "Four electron domains arrange themselves in 3D space as a tetrahedron to maximize separation and minimize repulsion." },
      { start: 140, duration: 35, text: "In an ideal tetrahedron like methane CH4, all four angles are 109.5 degrees." },
      { start: 175, duration: 40, text: "However, lone pairs are held only by the central Oxygen nucleus, so their electron clouds spread out more widely than bonded pairs." },
      { start: 215, duration: 40, text: "According to VSEPR theory, lone pair-lone pair repulsion is stronger than lone pair-bonding pair, which is stronger than bonding pair-bonding pair." },
      { start: 255, duration: 40, text: "These two bulky lone pairs push down on the O-H bonds, squeezing the angle from 109.5 degrees down to 104.5 degrees." },
      { start: 295, duration: 45, text: "When we name molecular geometry, we look only at the positions of the atoms, not the lone pairs. So the shape is classified as Bent." }
    ]
  },
  {
    id: 'kYB8IZa5AuE',
    url: 'https://www.youtube.com/watch?v=kYB8IZa5AuE',
    title: 'Linear Transformations and Matrices',
    channel: '3Blue1Brown',
    channelUrl: 'https://www.youtube.com/@3blue1brown',
    duration: 650,
    thumbnail: 'https://i.ytimg.com/vi/kYB8IZa5AuE/hqdefault.jpg',
    description: 'Visualizing linear transformations: what matrices actually represent geometrically in 2D and 3D space.',
    chapters: [
      {
        id: 'ch-la-1',
        chapterNumber: 1,
        startTime: 0,
        endTime: 160,
        title: 'What is a Linear Transformation? (0:00 - 2:40)',
        summary: 'Geometric definition of linearity: grid lines remain parallel and evenly spaced, and the origin remains fixed.',
        blackboardContent: 'Visual transformation of 2D grid lines. Two core rules: 1. Origin (0,0) remains fixed at the origin. 2. All straight grid lines remain straight and parallel and evenly spaced. Algebraic condition: T(c v + d w) = c T(v) + d T(w).',
        equations: ['T(c\\vec{v} + d\\vec{w}) = cT(\\vec{v}) + dT(\\vec{w})', 'T(\\vec{0}) = \\vec{0}'],
        keyConcepts: ['Linear Transformation', 'Grid Line Preservation', 'Origin Invariance']
      },
      {
        id: 'ch-la-2',
        chapterNumber: 2,
        startTime: 161,
        endTime: 420,
        title: 'Tracking Basis Vectors i-hat and j-hat (2:41 - 7:00)',
        summary: 'A matrix is simply a compact packaging of where standard unit vectors i-hat and j-hat land.',
        blackboardContent: 'Standard basis: i-hat = [1, 0]^T and j-hat = [0, 1]^T. If a linear transformation moves i-hat to [a, c]^T and j-hat to [b, d]^T, any vector [x, y]^T moves to x·[a, c]^T + y·[b, d]^T = [ax + by, cx + dy]^T. The matrix [a b; c d] encapsulates this entirely.',
        equations: [
          '\\hat{i} = \\begin{bmatrix} 1 \\\\ 0 \\end{bmatrix} \\to \\begin{bmatrix} a \\\\ c \\end{bmatrix}, \\quad \\hat{j} = \\begin{bmatrix} 0 \\\\ 1 \\end{bmatrix} \\to \\begin{bmatrix} b \\\\ d \\end{bmatrix}',
          '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} \\begin{bmatrix} x \\\\ y \\end{bmatrix} = x \\begin{bmatrix} a \\\\ c \\end{bmatrix} + y \\begin{bmatrix} b \\\\ d \\end{bmatrix} = \\begin{bmatrix} ax + by \\\\ cx + dy \\end{bmatrix}'
        ],
        keyConcepts: ['Basis Vectors', 'Matrix Columns as Transformed Basis', 'Linear Combinations']
      },
      {
        id: 'ch-la-3',
        chapterNumber: 3,
        startTime: 421,
        endTime: 650,
        title: 'Geometric Examples: Rotations and Shears (7:01 - 10:50)',
        summary: 'Examining 90-degree counterclockwise rotation and horizontal shear transformation matrices.',
        blackboardContent: '90-degree CCW rotation: i-hat [1, 0] lands on [0, 1], j-hat [0, 1] lands on [-1, 0]. Matrix is [0 -1; 1 0]. Horizontal shear: i-hat stays at [1, 0], j-hat tilts to [1, 1]. Matrix is [1 1; 0 1].',
        equations: [
          'R_{90^\\circ} = \\begin{bmatrix} 0 & -1 \\\\ 1 & 0 \\end{bmatrix}',
          '\\text{Shear} = \\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}'
        ],
        keyConcepts: ['Rotation Matrix', 'Shear Transformation', 'Determinant Area Scaling']
      }
    ],
    transcript: [
      { start: 0, duration: 15, text: "A matrix is often introduced as a bewildering set of arithmetic rules for multiplying rows by columns." },
      { start: 15, duration: 25, text: "In this video, I want to show you what a matrix actually represents geometrically: it is simply a linear transformation of space." },
      { start: 40, duration: 30, text: "A transformation is just a fancy word for a function: it takes in a vector as input and outputs a new vector." },
      { start: 70, duration: 35, text: "What makes it linear? Geometrically, all grid lines must remain straight and evenly spaced, and the origin must stay fixed." },
      { start: 105, duration: 35, text: "Because grid lines stay parallel and evenly spaced, every point in the 2D plane is completely determined by where unit vectors i-hat and j-hat land." },
      { start: 140, duration: 35, text: "i-hat is the unit vector pointing right [1, 0], and j-hat is the unit vector pointing up [0, 1]." },
      { start: 175, duration: 40, text: "Suppose a transformation moves i-hat to the coordinate [3, -2], and moves j-hat to the coordinate [1, 2]." },
      { start: 215, duration: 40, text: "Where does vector v = [-1, 2] go? It is -1 times i-hat plus 2 times j-hat. So it must land at -1*[3, -2] + 2*[1, 2] = [-1, 6]." },
      { start: 255, duration: 40, text: "Notice what happened: we just took a linear combination of where the basis vectors landed!" },
      { start: 295, duration: 45, text: "When we write a 2x2 matrix, the first column is literally where i-hat lands, and the second column is where j-hat lands." }
    ]
  },
  {
    id: 'zYierUhjNqw',
    url: 'https://www.youtube.com/watch?v=zYierUhjNqw',
    title: 'Harvard CS50: Algorithms & Big-O Notation',
    channel: 'CS50 / David J. Malan',
    channelUrl: 'https://www.youtube.com/@cs50',
    duration: 1120,
    thumbnail: 'https://i.ytimg.com/vi/zYierUhjNqw/hqdefault.jpg',
    description: 'Binary search, tearing the phonebook in half, and the mathematics of log n vs n complexity.',
    chapters: [
      {
        id: 'ch-cs-1',
        chapterNumber: 1,
        startTime: 0,
        endTime: 240,
        title: 'The Phonebook Search Problem: Linear vs Binary Search (0:00 - 4:00)',
        summary: 'Searching for Mike Smith: linear scan (page by page) vs dividing the problem in half each step.',
        blackboardContent: 'David Malan holding a 1,000-page yellow phonebook. Algorithm 1: Flip 1 page at a time (Linear Search O(n)). Algorithm 2: Flip 2 pages at a time (O(n/2) = O(n)). Algorithm 3: Open to middle, see names start with T, tear left half and throw away. Repeat on remaining half (Binary Search O(log n)).',
        equations: ['\\text{Steps} = \\log_2(N)', '\\log_2(1000) \\approx 10 \\, \\text{steps}', '\\log_2(4 \\times 10^9) \\approx 32 \\, \\text{steps}'],
        keyConcepts: ['Divide and Conquer', 'Binary Search', 'Logarithmic Complexity']
      },
      {
        id: 'ch-cs-2',
        chapterNumber: 2,
        startTime: 241,
        endTime: 620,
        title: 'Big-O Growth Curves & Asymptotic Analysis (4:01 - 10:20)',
        summary: 'Comparing runtime growth curves: O(1) constant, O(log n) logarithmic, O(n) linear, O(n log n), and O(n²) quadratic.',
        blackboardContent: 'Coordinate graph on blackboard comparing runtime curves as problem size N grows toward infinity. O(1) flat line, O(log n) sub-linear leveling off, O(n) diagonal line, O(n^2) steep upward parabola. Demonstrating that logarithmic algorithms scale to billions of inputs effortlessly.',
        equations: ['O(1) < O(\\log n) < O(n) < O(n \\log n) < O(n^2) < O(2^n)', 'T(n) = c \\cdot \\log_2(n)'],
        keyConcepts: ['Big-O Notation', 'Asymptotic Upper Bound', 'Complexity Hierarchy']
      }
    ],
    transcript: [
      { start: 0, duration: 15, text: "Welcome to CS50. Today we are exploring algorithms and computational complexity." },
      { start: 15, duration: 25, text: "An algorithm is simply step-by-step instructions for solving a problem, taking inputs and producing outputs." },
      { start: 40, duration: 30, text: "Imagine you have this phone book with 1,000 pages, and you want to find Mike Smith." },
      { start: 70, duration: 35, text: "Algorithm 1: Start at page 1. Is Mike Smith here? No. Page 2? No. In the worst case, this takes 1,000 page flips." },
      { start: 105, duration: 35, text: "Algorithm 2: Flip two pages at a time. It is twice as fast, but still linear: n over 2 steps." },
      { start: 140, duration: 40, text: "Algorithm 3: Open directly to the middle. The names start with M. Look at the section: are we before or after Smith?" },
      { start: 180, duration: 40, text: "If we are at T, Smith must be in the left half. We tear the right half in half and throw it away!" },
      { start: 220, duration: 40, text: "In a single step, we reduced 1,000 pages down to 500. Then 250, then 125, 62, 31, 16, 8, 4, 2, 1." },
      { start: 260, duration: 45, text: "In just 10 steps, we find Mike Smith. If the phone book has 4 billion people, it takes only 32 steps: log base 2 of 4 billion!" }
    ]
  }
];
