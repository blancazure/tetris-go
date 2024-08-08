package main

import (
    "html/template"
    "log"
    "net/http"
    "os"
    "github.com/gorilla/mux"
)

var templates = template.Must(template.ParseFiles("templates/index.html"))

func indexHandler(w http.ResponseWriter, r *http.Request) {
    templates.ExecuteTemplate(w, "index.html", nil)
}

func main() {
    r := mux.NewRouter()
    r.HandleFunc("/", indexHandler)
    r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("static/"))))

    puerto := os.Getenv("PUERTO_TETRIS")
    if puerto == "" {
        puerto = "3000"
    }

    log.Println("Servidor iniciado en el puerto:", puerto)
    log.Fatal(http.ListenAndServe(":"+puerto, r))
}