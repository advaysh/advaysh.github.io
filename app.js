
var courseAllocation; 
const courseAllocationKey = "courseAllocation"; // Do not change

async function saveCourseAllocation() {
    window.localStorage.setItem(courseAllocationKey, JSON.stringify(courseAllocation));
}

function getStudentPlanKey() {
    const student = document.getElementById("student-name").value;
    const plan = document.getElementById("plan-name").value;
    return `${student}/${plan}`;
}

async function allocateCourse(courseNumberKey, grade) {
    const studentPlanKey = getStudentPlanKey();
    if (courseAllocation[studentPlanKey] === undefined) {
        courseAllocation[studentPlanKey] = {};
    }
    courseAllocation[studentPlanKey][courseNumberKey] = grade;
    saveCourseAllocation();
}

async function unallocateCourse(courseNumberKey) {
    const studentPlanKey = getStudentPlanKey();
    if (courseAllocation[studentPlanKey] === undefined) {
        return;
    }
    delete courseAllocation[studentPlanKey][courseNumberKey];
    saveCourseAllocation();
}

async function updateCreditAllocation(courses) {
    const studentPlanKey = getStudentPlanKey();
    if (courseAllocation[studentPlanKey] === undefined) {
        return;
    }

    const creditAllocationByGrade = {
        "9": 0,
        "10": 0,
        "11": 0,
        "12": 0,
    };

    const creditAllocationBySubjectArea = {};
    for (sa of subjectAreas) {
        creditAllocationBySubjectArea[sa] = 0;
    }


    for (const courseNumberKey in courseAllocation[studentPlanKey]) {
        const course = getCourse(courseNumberKey, courses);
        const courseCredits = parseFloat(course["Credits"]);
        creditAllocationByGrade[`${courseAllocation[studentPlanKey][courseNumberKey]}`] += courseCredits;
        for (sa of getSubjectAreasForCourse(course)) {
            creditAllocationBySubjectArea[sa] += courseCredits;
        }
    }
    const grades = [9,10,11,12];
    var credits = 0;
    for (g of grades) {
        credits += creditAllocationByGrade[`${g}`]; 
        const node = document.getElementById(`total-${g}`);
        node.replaceChildren(); // Remove all current children
        node.appendChild(document.createTextNode(`${credits}`));
    }
    for (sa of subjectAreas) {
        const node = document.getElementById(`${sa}-credit`);
        try {
            node.removeChild(node.childNodes[1]);
        } catch(error) {} // do nothing 
        const credits = creditAllocationBySubjectArea[sa];
        node.appendChild(document.createTextNode(` (${credits})`));
    }
}

function getCourse(courseNumberKey, courses) {
    for (course of courses) {
        if (course["Course Number"] === courseNumberKey) return course;
    }
}

function isCourseAllocatedToGrade(courseNumberKey, grade) {
    const studentPlanCourseAllocation = courseAllocation[getStudentPlanKey()];
    if (studentPlanCourseAllocation === undefined) return false;
    return studentPlanCourseAllocation[courseNumberKey] === grade;
}


const subjectAreas = ["ela", "ss", "science", "math", "wl", "pe", "health", "vpa", "tclc", "pfl", "electives", "total", "te"];

function getSubjectAreasForCourse(course) {
    const ret = [];
    for (sa of subjectAreas) {
        if (isCourseInSubjectArea(course, sa)) {
             ret.push(sa);
        }
    }
    return ret;
}


async function updateScreen(courses) {
    const grades = [9, 10, 11, 12];

    for (sa of subjectAreas) {
        for (g of grades) {
            const saGNode = document.getElementById(sa + "-" + g)
            saGNode.replaceChildren(); // Remove all current children
            const tableNode = document.createElement("table");
            tableNode.setAttribute("class", "courseCheckboxTable");
            saGNode.appendChild(tableNode);
            for (c of courses) {
                if (c["Same as primary"] !== "") continue;
                if (isCourseInSubjectArea(c, sa) && isCourseOfferedInGrade(c, g)) {
                    if (sa != "total" && sa != "te") {
                        addCourseToSubjectAreaAndGradeNode(saGNode, c, sa, g, (allocated, course, grade) => { updateScreen(courses) });
                    }
                }
            }
        }
    }

    updateCreditAllocation(courses);
}

function isCourseInSubjectArea(course, subjectArea) {
    if (course["Subject Area"] === "English" && subjectArea === "ela") return true;
    if (course["Subject Area"] === "Social Studies" && subjectArea === "ss") return true;
    if (course["Subject Area"] === "Science" && subjectArea === "science") return true;
    if (course["Subject Area"] === "Mathematics" && subjectArea === "math") return true;
    if (course["Subject Area"] === "World Languages/ESOL" && subjectArea === "wl") return true;
    if (course["Subject Area"] === "Visual/Performing Arts" && subjectArea === "vpa") return true;
    if (course["Subject Area"] === "Visual/Performing Arts - Music" && subjectArea === "vpa") return true;
    if (course["Subject Area"] === "Physical Education" && (subjectArea === "pe" || subjectArea === "health")) return true;
    if (course["Subject Area"] === "Business/Technology" && subjectArea === "tclc") return true;
    if (course["Subject Area"] === "Practical Arts - Family & Consumer Sciences" && subjectArea === "tclc") return true;
    if (course["Subject Area"] === "Practical Arts - Technology & Occupational Education" && subjectArea === "tclc") return true;
    if ((course["Course Number"] === "320" || course["Course Number"] === "560") && subjectArea === "pfl") return true;
    if (course["Elective?"] !== "0" && subjectArea === "electives") return true;
    return false
}

function isCourseOfferedInGrade(course, grade) {
    const minGrade = parseInt(course["Min grade offered"]);
    const maxGrade = parseInt(course["Max grade offered"]);
    return grade >= minGrade && grade <= maxGrade;
}

function addCourseToSubjectAreaAndGradeNode(node, course, subjectArea, grade, onAllocationChanged) {
    const tr = document.createElement("tr");
    tr.setAttribute("class", "courseCheckboxTable");
    const td = document.createElement("td");
    td.setAttribute("class", "courseCheckboxTable");
    const courseCheckboxNode = document.createElement("input");
    courseCheckboxNode.setAttribute("type", "checkbox");
    // courseCheckboxNode.setAttribute("class", "noPrint");
    courseCheckboxNode.setAttribute("id", getCourseCheckboxId(course, subjectArea, grade));
    courseCheckboxNode.checked = isCourseAllocatedToGrade(course["Course Number"], grade);
    setPrintClass(courseCheckboxNode.checked, tr);
    courseCheckboxNode.addEventListener("change", () => {
        setPrintClass(courseCheckboxNode.checked, tr);
        onAllocationChanged(courseCheckboxNode.checked, course, grade);
        if (courseCheckboxNode.checked) {
            allocateCourse(course["Course Number"], grade);
        }
        else {
            unallocateCourse(course["Course Number"]);
        }
        onAllocationChanged();
    });
    const courseCheckboxLabelNode = document.createElement("label");

    courseCheckboxLabelNode.setAttribute("for", getCourseCheckboxId(course, subjectArea, grade));
    courseCheckboxLabelNode.textContent = `${course["Course Number"]} ${course["Course Name"]} (${course["Credits"]})`;
    courseCheckboxLabelNode.setAttribute("title", course["Prerequisites"])
    td.appendChild(courseCheckboxNode);
    td.appendChild(courseCheckboxLabelNode);
    node.appendChild(tr).appendChild(td);
}

function setPrintClass(checked, parentNode) {
    if (checked) {
      parentNode.setAttribute("class", "");
    } else {
      parentNode.setAttribute("class", "noPrint");
    }
}

function getCourseCheckboxId(course, subjectArea, grade) {
    return subjectArea + "-" + grade + "-" + course["Course Number"];
}
