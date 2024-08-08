package main

import (
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "github.com/gorilla/mux"
)

func main() {
    router := mux.NewRouter()

    // Servir archivos estáticos desde el directorio "./static"
    router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static/"))))

    // Manejar la ruta principal para servir el archivo HTML principal
    router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "./templates/index.html")
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    server := &http.Server{
        Addr:    ":" + port,
        Handler: router,
    }

    // Canal para recibir las señales del sistema
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

    // Iniciar el servidor en una goroutine
    go func() {
        log.Println("Iniciando servidor en el puerto " + port)
        if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Error en ListenAndServe: %v\n", err)
        }
    }()

    // Esperar una señal de parada
    <-stop

    // Realizar una parada limpia del servidor
    log.Println("Deteniendo servidor...")
    if err := server.Close(); err != nil {
        log.Fatalf("Error en la parada del servidor: %v\n", err)
    }
    log.Println("Servidor detenido.")
}