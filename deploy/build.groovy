pipeline {
    agent any

    options {
        ansiColor('xterm')
    }

    environment {
        APP_NAME = "frontend-changenow-2-0"
    }

    stages {
        stage('Trigger staging specific branch jobs') {
            when {
                expression {
                    env.TAG_NAME == null
                }
            }
            steps {
                script {
                    echo "Staging..."
                    build(
                        job: "Frontend-changenow-2-0.build-stage",
                        parameters: [
                            string(name: "STAGE", value: "staging"),
                            string(name: "BRANCH_NAME", value: "${env.BRANCH_NAME}"),
                            string(name: "BUILD_FOLDER", value: "${WORKSPACE}"),
                            string(name: "DEPLOY_ENV", value: "staging")
                        ],
                        wait: true
                    )
                }
            }
            post {
                success {
                    slackSend(
                        channel: "#cn-front-deploy",
                        color: "good",
                        message: "`${env.APP_NAME}` is built successfully\n *Branch*: `${env.BRANCH_NAME}`\n *Stage*: `staging`\n *Link*: ${env.BUILD_URL}"
                    )
                }
                failure {
                    slackSend(
                        channel: "#cn-front-deploy",
                        color: "danger",
                        message: "`${env.APP_NAME}` build is failed\n *Branch*: `${env.BRANCH_NAME}`\n *Stage*: `staging`\n *Link*: ${env.BUILD_URL}"
                    )
                }
            }
        }

        stage('Trigger production specific branch jobs') {
            when {
                expression {
                    env.TAG_NAME != null || env.BRANCH_NAME == "master" || env.BRANCH_NAME == "main"
                }
            }
            steps {
                script {
                    echo "Production..."
                    build(
                        job: "Frontend-changenow-2-0.build-stage",
                        parameters: [
                            string(name: "STAGE", value: "production"),
                            string(name: "BRANCH_NAME", value: "${env.BRANCH_NAME}"),
                            string(name: "BUILD_FOLDER", value: "${WORKSPACE}"),
                            string(name: "DEPLOY_ENV", value: "production")
                        ],
                        wait: true
                    )
                }
            }
            post {
                success {
                    slackSend(
                        channel: "#cn-front-deploy",
                        color: "good",
                        message: "`${env.APP_NAME}` is built successfully\n *Branch*: `${env.BRANCH_NAME}`\n *Stage*: `production`\n *Link*: ${env.BUILD_URL}"
                    )
                }
                failure {
                    slackSend(
                        channel: "#cn-front-deploy",
                        color: "danger",
                        message: "`${env.APP_NAME}` build is failed\n *Branch*: `${env.BRANCH_NAME}`\n *Stage*: `production`\n *Link*: ${env.BUILD_URL}"
                    )
                }
            }
        }
    }
}
