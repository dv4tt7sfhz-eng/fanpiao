import Foundation
import UIKit

/// 用户自己的 AI 密钥（OpenAI 兼容的 /chat/completions）。密钥只存在这台手机上，只发给用户选的那一家。
enum AIClient {
    struct Failure: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    /// 发一段说明 + 几张照片，拿回模型写的 JSON（字符串）
    static func ask(_ ep: AIEndpoint, prompt: String, images: [UIImage] = [], userText: String? = nil) async throws -> String {
        guard !ep.key.isEmpty else { throw Failure(message: L.aiNoKey) }
        guard !ep.base.isEmpty, !ep.model.isEmpty else { throw Failure(message: L.aiNoVision) }
        guard let url = URL(string: ep.base.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/chat/completions") else { throw Failure(message: L.aiBadBase) }

        var messages: [[String: Any]] = []
        if images.isEmpty {
            messages.append(["role": "system", "content": prompt])
            messages.append(["role": "user", "content": userText ?? ""])
        } else {
            var content: [[String: Any]] = [["type": "text", "text": prompt]]
            for img in images.prefix(2) {
                guard let jpg = shrink(img).jpegData(compressionQuality: 0.72) else { continue }
                content.append(["type": "image_url", "image_url": ["url": "data:image/jpeg;base64," + jpg.base64EncodedString()]])
            }
            messages.append(["role": "user", "content": content])
        }
        let body: [String: Any] = ["model": ep.model, "messages": messages, "temperature": 0.2, "max_tokens": 1500]

        var req = URLRequest(url: url, timeoutInterval: 60)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer " + ep.key, forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, resp): (Data, URLResponse)
        do { (data, resp) = try await URLSession.shared.data(for: req) } catch { throw Failure(message: L.aiNetwork) }
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if code == 401 || code == 403 { throw Failure(message: L.aiBadKey) }
        if code == 400 || code == 404 { throw Failure(message: images.isEmpty ? L.aiBadModel : L.aiNoVision) }
        if code == 429 { throw Failure(message: L.aiBusy) }
        guard (200..<300).contains(code) else { throw Failure(message: L.aiFailed(code)) }

        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = obj["choices"] as? [[String: Any]],
              let msg = choices.first?["message"] as? [String: Any],
              let text = msg["content"] as? String else { throw Failure(message: L.aiBadReply) }
        // 只要第一个 { 到最后一个 } 之间的 JSON（有的模型会包一层 ```json）
        guard let a = text.firstIndex(of: "{"), let b = text.lastIndex(of: "}"), a < b else { throw Failure(message: L.aiBadReply) }
        let json = String(text[a...b])
        guard (try? JSONSerialization.jsonObject(with: Data(json.utf8))) != nil else { throw Failure(message: L.aiBadReply) }
        return json
    }

    /// 长边缩到 1280，省流量也更快
    static func shrink(_ img: UIImage, max side: CGFloat = 1280) -> UIImage {
        let s = img.size
        let k = min(1, side / max(s.width, s.height))
        guard k < 1 else { return img }
        let size = CGSize(width: s.width * k, height: s.height * k)
        return UIGraphicsImageRenderer(size: size).image { _ in img.draw(in: CGRect(origin: .zero, size: size)) }
    }
}
