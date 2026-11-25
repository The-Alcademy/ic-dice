//#region src/faces.ts
var e = [
	{
		facultyLetter: "R",
		faculty: "REBIS",
		colour: "Purple",
		core: "#8659a3",
		glow: "#c8a5df",
		deep: "#66248e",
		domain: "PsychoAlchemy",
		gloss: "transmute belief — hold opposites until a new whole forms",
		hall: "the Looking Glass",
		title: "the Hall of Reflection",
		prep: "at"
	},
	{
		facultyLetter: "P",
		faculty: "PILOT",
		colour: "Red",
		core: "#cc2f2a",
		glow: "#f28176",
		deep: "#b9191a",
		domain: "PsychoNautics",
		gloss: "steer your own consciousness",
		hall: "the Lantern",
		title: "the Hall of Perception",
		prep: "in"
	},
	{
		facultyLetter: "S",
		faculty: "SALVE",
		colour: "Orange",
		core: "#ec8a1c",
		glow: "#ffae5f",
		deep: "#995705",
		domain: "PsychoTherapeutics",
		gloss: "tend and restore wellbeing",
		hall: "the Sensorium",
		title: "the Hall of Sensing",
		prep: "in"
	},
	{
		facultyLetter: "I",
		faculty: "IMPRO",
		colour: "Yellow",
		core: "#f5cc1f",
		glow: "#ffe968",
		deep: "#7a6500",
		domain: "PsychoLudics",
		gloss: "play in earnest — to improvise",
		hall: "the Drawing Board",
		title: "the Hall of Invention",
		prep: "at"
	},
	{
		facultyLetter: "W",
		faculty: "WEAVE",
		colour: "Green",
		core: "#3f8148",
		glow: "#84c08a",
		deep: "#295930",
		domain: "PsychoTerranics",
		gloss: "live woven into the web of life",
		hall: "the Ramble",
		title: "the Hall of Wandering",
		prep: "on"
	},
	{
		facultyLetter: "A",
		faculty: "ALIGN",
		colour: "Blue",
		core: "#264792",
		glow: "#92a2e7",
		deep: "#022e74",
		domain: "PsychoTechnics",
		gloss: "test reality and name what's true",
		hall: "the Anomaly",
		title: "the Hall of Asking",
		prep: "at"
	}
], t = [
	{
		room: "Closet",
		verb: "acquire",
		phrase: "acquiring it",
		icon: "key"
	},
	{
		room: "Workshop",
		verb: "practise",
		phrase: "practising it",
		icon: "anvil"
	},
	{
		room: "Alcove",
		verb: "reflect",
		phrase: "reflecting on it",
		icon: "lamp"
	},
	{
		room: "Parlour",
		verb: "encounter",
		phrase: "encountering it",
		icon: "table"
	}
], n = "#1F2A33", r = "#eae2d0", i = "#2B5468";
function a(t) {
	let n = e.find((e) => e.facultyLetter === t);
	if (!n) throw Error(`No School ${t} on the cube`);
	return n;
}
var o = [
	{
		code: "S",
		name: "Sphere",
		faces: 0,
		ring: 0,
		place: "the Clearing"
	},
	{
		code: "T",
		name: "Tetrahedron",
		faces: 4,
		ring: 1,
		place: "Forest"
	},
	{
		code: "H",
		name: "Hexahedron",
		faces: 6,
		ring: 2,
		place: "Meadowland"
	},
	{
		code: "O",
		name: "Octahedron",
		faces: 8,
		ring: 3,
		place: "River"
	},
	{
		code: "D",
		name: "Dodecahedron",
		faces: 12,
		ring: 4,
		place: "Foothills"
	},
	{
		code: "I",
		name: "Icosahedron",
		faces: 20,
		ring: 5,
		place: "Mountains"
	}
];
function s(e) {
	let t = o.find((t) => t.code === e);
	if (!t) throw Error(`No solid "${e}" on the solid die: it is one of ${o.map((e) => e.code).join(", ")}`);
	return t;
}
var c = {
	P: "R",
	S: "O",
	I: "Y",
	W: "G",
	A: "B",
	R: "P"
};
function l(e, t) {
	let n = c[e];
	if (!n) throw Error(`No School ${String(e)} on the cube`);
	let r = s(t);
	return r.code === "S" ? null : n + r.code;
}
function u(e) {
	let n = t.find((t) => t.verb === e);
	if (!n) throw Error(`No sub-stance "${e}" on the tetrahedron`);
	return n;
}
//#endregion
export { e as CUBE, n as INK, r as INK_ON_DARK, o as SOLIDS, t as TETRA, i as WRITTEN, l as geocodeFor, a as schoolByLetter, s as solidByCode, u as subStanceByVerb };
