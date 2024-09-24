### Ett "rum" för elever som tillhör samma grupp (Ex Stockholms Bridgeskola). En större datatyp som har som primära syfte att det ska bli enkelt för oss att expandera på detta framåt. Inledningsvis kommer vi bara ha en av denna, dvs Bridgeskolan
* DbEducationRoom (eller kom på bättre namn)
  - String Name
  - Description
  - List<DbCourse> Courses // (store as list of strings, Uid)
  - List<DbUser> Users // (store as list of strings, Uid)
  - List<DbQuestion> Questions // students can submit questions that teachers can answer

### A specific course, 
* DbCourse
  - string Title
  - string Description
  - List<DbChapter> Chapters // (store as list of strings, Uid)
  - List<DbUser> Users // (store as list of strings, Uid)

### A specific chapter in a course
* DbChapter
  - string CourseId // the same as the id of it's course
  - int ChapterNumber
  - string Title
  - string Description
  - string Data // the contents of the chapter, encoded as a string
  - List<DbPracticeSets> PracticeSets // (store as list of strings, Uid)

### Data for practiceing bidding, play etc
* DbPracticeSet
  - string Title
  - string Description
  - int PracticeType (bidding/lead/play)
  - string Data

### Works as a thread for some Q&A section where students submit questions and teachers can answer (other students can comment as well)
* DbQuestion
  - string Title
  - string Description
  - int QuestionType (bidding, lead, play, other)
  - DbChat Chat // a thread for this question










  DbQuestion - Post type
  DbPracticeSet - Post type
  DbChapter - Post type - subtype is chapterNumber
  DbCourse -  Course {title, desc, data}
  DbRoom -    users has "rooms", room only has name and desc
  
  A role must be created for the people in the same course 
