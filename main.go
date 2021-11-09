package main

import (
	"bytes"
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"

	flag "github.com/spf13/pflag"
)

func main() {
	// Flag for skin of replay (and default to blueberry, the best skin)
	var skinFlag = flag.StringP("skin", "s", "blueberry_v1_7_0", "Skin to use")
	flag.Parse()

	replayFile := flag.Arg(0)
	if replayFile == "" {
		fmt.Println("Missing file path to the replay..")
		os.Exit(1)
	}

	params := map[string]string{
		"skin": *skinFlag,
		"username": "Holly",
		"resolution": "1280x720",
	}

	req, err := UploadReplay(replayFile, params)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	// Sends our request
	client := &http.Client{}
	resp, err := client.Do(req)

	if err != nil {
		fmt.Println(err)
	} else {
		var bodyContent = make([]byte, req.ContentLength)
		fmt.Println(resp.StatusCode)
		resp.Body.Read(bodyContent)
		resp.Body.Close()
		fmt.Println(string(bodyContent))
	}
}

func UploadReplay(path string, params map[string]string) (*http.Request, error) {
	f, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	body := &bytes.Buffer{}

	w := multipart.NewWriter(body)
	// Add our file field
	part, err := w.CreateFormFile("replayFile", filepath.Base(path))
	if err != nil {
		return nil, err
	}
	part.Write(f) // Write replay content

	// Do the other params
	for key, val := range params {
		_ = w.WriteField(key, val)
	}

	err = w.Close()
	if err != nil {
		return nil, err
	}

	req, _ := http.NewRequest("POST", "https://ordr-api.issou.best/renders", body)
	req.Header.Add("Content-Type", w.FormDataContentType()) // Set content-type to be multipart
	return req, nil
}

