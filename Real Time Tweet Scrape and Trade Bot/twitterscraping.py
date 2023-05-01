import requests
import json

def lambda_handler(event, context):
    bearer_token = "AAAAAAAAAAAAAAAAAAAAACa1kwEAAAAAbEAmwIwIJqlBbLe0UNwJB2jKp%2Fs%3DB3NXaC4qXUTNQvjm2CGS3zf7BPU1XN1jxY76shYW7oHyKd90bk"

    def bearer_oauth(r):
        """
        Method required by bearer token authentication.
        """

        r.headers["Authorization"] = f"Bearer {bearer_token}"
        r.headers["User-Agent"] = "v2FilteredStreamPython"
        return r


    def get_rules():
        response = requests.get(
            "https://api.twitter.com/2/tweets/search/stream/rules", auth=bearer_oauth
        )
        if response.status_code != 200:
            raise Exception(
                "Cannot get rules (HTTP {}): {}".format(response.status_code, response.text)
            )
        print(json.dumps(response.json()))
        return response.json()


    def delete_all_rules(rules):
        if rules is None or "data" not in rules:
            return None

        ids = list(map(lambda rule: rule["id"], rules["data"]))
        payload = {"delete": {"ids": ids}}
        response = requests.post(
            "https://api.twitter.com/2/tweets/search/stream/rules",
            auth=bearer_oauth,
            json=payload
        )
        if response.status_code != 200:
            raise Exception(
                "Cannot delete rules (HTTP {}): {}".format(
                    response.status_code, response.text
                )
            )
        print(json.dumps(response.json()))


    def set_rules(delete):
        # You can adjust the rules if needed
        sample_rules = [
            {"value": "-is:retweet from:NFTcryptonite1", "tag": "contract Address"},
        ]
        payload = {"add": sample_rules}
        response = requests.post(
            "https://api.twitter.com/2/tweets/search/stream/rules",
            auth=bearer_oauth,
            json=payload,
        )
        if response.status_code != 201:
            raise Exception(
                "Cannot add rules (HTTP {}): {}".format(response.status_code, response.text)
            )
        print(json.dumps(response.json()))


    def get_stream(set):
        response = requests.get(
            "https://api.twitter.com/2/tweets/search/stream", auth=bearer_oauth, stream=True,
        )
        print(response.status_code)
        if response.status_code != 200:
            raise Exception(
                "Cannot get stream (HTTP {}): {}".format(
                    response.status_code, response.text
                )
            )
        for response_line in response.iter_lines():
            if response_line:
                json_response = json.loads(response_line)
                for each_word in json_response["data"]["text"].split():
                    if len(each_word) == 42:
                        r = requests.post(url = "https://ad5c-2405-201-200d-e1b4-9c62-63-4481-9a72.in.ngrok.io/hook", params = {"twitter_contract_address": each_word})
                        print(each_word)
                print("Data: ",json.dumps(json_response, indent=4, sort_keys=True))


    def main():
        rules = get_rules()
        delete = delete_all_rules(rules)
        set = set_rules(delete)
        get_stream(set)


    if __name__ == "__main__":
        main()
    
    return {}